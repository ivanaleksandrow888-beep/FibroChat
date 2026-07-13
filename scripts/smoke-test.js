"use strict";
process.env.PORT="39001";
delete process.env.DATABASE_URL;
const http=require("http");
const {startServer}=require("../server/application");
(async()=>{const server=await startServer();http.get("http://127.0.0.1:39001/api/health",res=>{let body="";res.on("data",c=>body+=c);res.on("end",()=>{const data=JSON.parse(body);if(!data.ok)process.exitCode=1;console.log("Smoke test:",data.ok,data.version,data.database);server.close();});}).on("error",e=>{console.error(e);server.close();process.exitCode=1;});})();
