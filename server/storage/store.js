"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const config = require("../config");

const COLLECTION_TABLES = Object.freeze({
  users: "users", invites: "invites", messages: "messages", audit: "audit_log",
  notifications: "notifications", support: "support_tickets", devices: "devices",
  sessions: "sessions", deviceApprovals: "device_approvals", pushSubscriptions: "push_subscriptions", contacts: "contacts"
});

class FibroStore {
  constructor() {
    this.mode = config.DATABASE_URL ? "postgresql" : "json-development-fallback";
    this.pool = null;
    this.collections = new Map();
    this.singletons = new Map();
    this.versions = new Map();
    this.writeChain = Promise.resolve();
    this.refreshTimer = null;
  }

  async initialize() {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
    if (this.mode === "postgresql") {
      this.pool = new Pool({ connectionString: config.DATABASE_URL, ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : false, max: 10 });
      await this.pool.query("SELECT 1");
      await this.applyMigrations();
      await this.loadAllFromPostgres();
      if (config.MIGRATE_LEGACY_JSON) await this.importLegacyJsonIfEmpty();
      this.refreshTimer = setInterval(() => this.refreshChangedCollections().catch(console.error), 2000);
      this.refreshTimer.unref();
      await this.registerNode();
    } else {
      this.loadAllFromJson();
      console.warn("DATABASE_URL is absent: using JSON only as a local development fallback.");
    }
  }

  async applyMigrations() {
    const dir = path.join(config.ROOT_DIR, "database", "migrations");
    const files = fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort();
    for (const file of files) await this.pool.query(fs.readFileSync(path.join(dir, file), "utf8"));
  }

  collection(name) { return structuredClone(this.collections.get(name) || []); }
  singleton(name, fallback = {}) { return structuredClone(this.singletons.get(name) || fallback); }

  setCollection(name, value) {
    const data = structuredClone(Array.isArray(value) ? value : []);
    this.collections.set(name, data);
    if (this.mode === "postgresql") this.enqueue(() => this.persistCollection(name, data));
    else this.persistJsonCollection(name, data);
  }

  setSingleton(name, value) {
    const data = structuredClone(value || {});
    this.singletons.set(name, data);
    if (this.mode === "postgresql") this.enqueue(() => this.persistSingleton(name, data));
    else this.persistJsonSingleton(name, data);
  }

  enqueue(task) {
    this.writeChain = this.writeChain.then(task, task).catch((error) => console.error("Database write failed:", error));
    return this.writeChain;
  }

  async flush() { await this.writeChain; }

  legacyPath(name) {
    const map = { users:"users.json", invites:"invites.json", messages:"messages.json", audit:"audit.json", notifications:"notifications.json", support:"support.json", devices:"devices.json", sessions:"sessions.json", deviceApprovals:"device-approvals.json", pushSubscriptions:"push-subscriptions.json", contacts:"contacts.json", network:"network.json" };
    return path.join(config.DATA_DIR, map[name]);
  }

  loadAllFromJson() {
    for (const name of Object.keys(COLLECTION_TABLES)) {
      const file = this.legacyPath(name);
      let value = [];
      try { value = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
      this.collections.set(name, Array.isArray(value) ? value : []);
    }
    let network = {};
    try { network = JSON.parse(fs.readFileSync(this.legacyPath("network"), "utf8")); } catch {}
    this.singletons.set("network", network && typeof network === "object" ? network : {});
  }

  persistJsonCollection(name, value) { fs.writeFileSync(this.legacyPath(name), JSON.stringify(value, null, 2) + "\n"); }
  persistJsonSingleton(name, value) { fs.writeFileSync(this.legacyPath(name), JSON.stringify(value, null, 2) + "\n"); }

  async loadAllFromPostgres() {
    for (const [name, table] of Object.entries(COLLECTION_TABLES)) {
      const result = await this.pool.query(`SELECT document FROM ${table} ORDER BY updated_at, id`);
      this.collections.set(name, result.rows.map((row) => row.document));
    }
    const network = await this.pool.query("SELECT document FROM network_config WHERE key='network'");
    this.singletons.set("network", network.rows[0]?.document || {});
    const versions = await this.pool.query("SELECT collection, version FROM collection_versions");
    for (const row of versions.rows) this.versions.set(row.collection, Number(row.version));
  }

  async persistCollection(name, value) {
    const table = COLLECTION_TABLES[name];
    if (!table) throw new Error(`Unknown collection: ${name}`);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const ids = value.map((item) => String(item.id || crypto.randomUUID()));
      if (ids.length) await client.query(`DELETE FROM ${table} WHERE NOT (id = ANY($1::text[]))`, [ids]);
      else await client.query(`DELETE FROM ${table}`);
      for (let i=0;i<value.length;i++) {
        const doc = { ...value[i], id: ids[i] };
        await client.query(`INSERT INTO ${table}(id,document,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document, updated_at=now()`, [ids[i], JSON.stringify(doc)]);
      }
      const v = (this.versions.get(name) || 0) + 1;
      await client.query("INSERT INTO collection_versions(collection,version,updated_at) VALUES($1,$2,now()) ON CONFLICT(collection) DO UPDATE SET version=$2,updated_at=now()", [name, v]);
      await client.query("COMMIT");
      this.versions.set(name, v);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async persistSingleton(name, value) {
    await this.pool.query("INSERT INTO network_config(key,document,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(key) DO UPDATE SET document=EXCLUDED.document,updated_at=now()", [name, JSON.stringify(value)]);
    const v=(this.versions.get(name)||0)+1;
    await this.pool.query("INSERT INTO collection_versions(collection,version,updated_at) VALUES($1,$2,now()) ON CONFLICT(collection) DO UPDATE SET version=$2,updated_at=now()",[name,v]);
    this.versions.set(name,v);
  }

  async refreshChangedCollections() {
    const result = await this.pool.query("SELECT collection,version FROM collection_versions");
    for (const row of result.rows) {
      const name=row.collection, version=Number(row.version);
      if (version <= (this.versions.get(name)||0)) continue;
      if (name === "network") {
        const x=await this.pool.query("SELECT document FROM network_config WHERE key='network'");
        this.singletons.set("network",x.rows[0]?.document||{});
      } else if (COLLECTION_TABLES[name]) {
        const x=await this.pool.query(`SELECT document FROM ${COLLECTION_TABLES[name]} ORDER BY updated_at,id`);
        this.collections.set(name,x.rows.map(r=>r.document));
      }
      this.versions.set(name,version);
    }
  }

  async importLegacyJsonIfEmpty() {
    for (const name of Object.keys(COLLECTION_TABLES)) {
      if ((this.collections.get(name)||[]).length) continue;
      const file=this.legacyPath(name); if(!fs.existsSync(file)) continue;
      try { const value=JSON.parse(fs.readFileSync(file,"utf8")); if(Array.isArray(value)&&value.length){this.collections.set(name,value);await this.persistCollection(name,value);} } catch {}
    }
    if (!Object.keys(this.singletons.get("network")||{}).length && fs.existsSync(this.legacyPath("network"))) {
      try { const value=JSON.parse(fs.readFileSync(this.legacyPath("network"),"utf8")); this.singletons.set("network",value); await this.persistSingleton("network",value); } catch {}
    }
  }

  async registerNode() {
    const network=this.singletons.get("network")||{};
    const nodeId=config.NODE_ID||network.nodeId||crypto.randomUUID();
    await this.pool.query("INSERT INTO cluster_nodes(node_id,region,status,last_seen_at,metadata) VALUES($1,$2,'online',now(),$3::jsonb) ON CONFLICT(node_id) DO UPDATE SET region=$2,status='online',last_seen_at=now(),metadata=$3::jsonb",[nodeId,config.NODE_REGION,JSON.stringify({appVersion:config.APP_VERSION})]);
    setInterval(()=>this.pool.query("UPDATE cluster_nodes SET last_seen_at=now(),status='online' WHERE node_id=$1",[nodeId]).catch(()=>null),10000).unref();
  }

  async close() { if(this.refreshTimer)clearInterval(this.refreshTimer);await this.flush();if(this.pool)await this.pool.end(); }
}

module.exports = new FibroStore();
