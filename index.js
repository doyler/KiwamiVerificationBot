/*
            ___                                    _          
           / _ \                                  (_)         
          / /_\ \_ __   ___  _ __  _   _ _ __ ___  _  ___ ___ 
          |  _  | '_ \ / _ \| '_ \| | | | '_ ` _ \| |/ __/ _ \
          | | | | | | | (_) | | | | |_| | | | | | | | (_|  __/
          \_| |_/_| |_|\___/|_| |_|\__, |_| |_| |_|_|\___\___|
                                    __/ |                     
                                   |___/                      
          ______ _                       _  ______       _    
          |  _  (_)                     | | | ___ \     | |   
          | | | |_ ___  ___ ___  _ __ __| | | |_/ / ___ | |_  
          | | | | / __|/ __/ _ \| '__/ _` | | ___ \/ _ \| __| 
          | |/ /| \__ \ (_| (_) | | | (_| | | |_/ / (_) | |_  
          |___/ |_|___/\___\___/|_|  \__,_| \____/ \___/ \__| 
                                                              
                                                       
*/
/*##############################################################################
# File: index.js                                                               #
# Project: Anonymice - Discord Bot                                             #
# Author/Updater: Doyler (@NftDoyler)                                          #
# Original Author(s): Oliver Renner (@_orenner) & slingn.eth (@slingncrypto)   #
# © 2021                                                                       #
###############################################################################*/

const config = require("./src/config");
const logger = require("./src/utils/logger");
const banner = require("./src/utils/banner");
const mongoose = require("mongoose");
const app = require("./src/app");
const DiscordBot = require("./src/discordBot");
const Synchronizer = require("./src/synchronizer");

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
    path: path.join(__dirname, '../../.env')
});

/*##############################################################################
express SSL support - https://expressjs.com/en/api.html
##############################################################################*/

// Default to HTTP in case something weird happens
const http = require('http');
let webServer = http.createServer(app);

// https://dev.to/omergulen/step-by-step-node-express-ssl-certificate-run-https-server-from-scratch-in-5-steps-5b87
if (process.env.APPLICATION_SERVER_PUBLIC_SCHEME === "https") {
  const https = require('https');
  const fs = require('fs');

  webServer = https.createServer({
    key: fs.readFileSync(process.env.SSL_PRIVATE_KEY),
    cert: fs.readFileSync(process.env.SSL_PUBLIC_CERT),
  }, app);
}

logger.info(banner);

logger.info(`Starting ${config.application.name}...`)

let server;
mongoose.connect(config.mongodb.url, config.mongoose.options)
.then(async () => {
  logger.info("Connected to MongoDB");

  //start the web server
  server = await webServer.listen(config.application.port, () => {
    logger.info(
      `${config.application.name} is running at port ${config.application.port}`
    );
  });

  //todo: migrate to another node hosting script
  //start the discord bot
  await DiscordBot.start();

  //todo: migrate to another node hosting script
  //start the daily role verification sync process
  await Synchronizer.start();
  if(config.sync.syncOnStartup && config.sync.syncOnStartup === "true"){
    logger.info(`Synchronize on startup as been enabled, executing first synchronization cycle immediately...`)
    await Synchronizer.execute();
  }
})
.catch(error => {
  exitHandler(error)
});

//todo: deprecate once other services are moved to another node hosting script
const stopServices = (shouldLog) => {
  if (server) {
    server.close();
    logger.info("Server closed");
  }
  if (DiscordBot) {
    DiscordBot.stop();
    logger.info("Discord Client closed");
  }
  if (Synchronizer) {
    Synchronizer.stop();
    logger.info("Synchronizer stopped");
  }
};

const exitHandler = (error) => {  
  stopServices(true);
  if(error) {
    logger.error(error.message);
    logger.error(error.stack);
    process.exit(-1);
  }
  process.exit(0);
  
}

const unexpectedErrorHandler = (error) => {
  logger.error(error.message);
  logger.error(error.stack)
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGINT", () => {
  logger.info("SIGNINT received");
  logger.info(`Stopping ${config.application.name}`);
  stopServices();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("SIGNTERM received");
  logger.info(`Stopping ${config.application.name}`);
  stopServices();
  process.exit(0);
});
