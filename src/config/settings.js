/*##############################################################################
# File: settings.js                                                            #
# Project: Kiwami Verification Discord Bot                                     #
# Author: Doyler (@NftDoyler)                                                  #
# Original Author(s): Oliver Renner (@_orenner) & slingn.eth (@slingncrypto)   #
# © 2021                                                                       #
###############################################################################*/

const KiwamiABI = require("../contracts/kiwami_abi.json");

const settings = {
  rules: [
    {
      name: "Kiwami Verification Bot",
      executor: {
        type: "KiwamiVerificationRule.js",
        config: {
          roles: [
            {
              // Make sure that these values are correct
              name: "Kyodai",
              id: "938562612466180186"
            },
            {
              // Make sure that these values are correct
              name: "Shateigashira",
              id: "938562308379140096"
            },
            {
              // Make sure that these values are correct
              name: "Wakagashira",
              id: "938562249533030510"
            }
          ],
          KiwamiContract: {
            Address: "0x701a038af4bd0fc9b69a829ddcb2f61185a49568",
            ABI: KiwamiABI,
          }
        },
      },
    },
  ],
};

module.exports = settings;