const logger = require("../utils/logger");
const getProvider = require("../web3/provider");
const { Contract } = require("ethers");
const discordBot = require("../discordBot");

/**
 * Kiwami Verification Rule - checks for any and all Kiwami to give the holder roles.
 * 
 * Modified by Doyler (@NftDoyler) - 0xeD19c8970c7BE64f5AC3f4beBFDDFd571861c3b7
 */
class KiwamiVerificationRule {
    constructor(config) {
        this.config = config;
        this.logger = require("../utils/logger");
        
        // The max number of users that can have the role
        this.maxCount = 10000;
    }

    /**
     * Executes changes to the Discord Users assigned roles using the result from
     * the check method.
     * 
     * As we are only adding ONE role this is a modified version of the AnonymiceVerificationRule.
     * 
     * @param discordUser - The Discord User
     * @param role - The Discord Role which should be affected
     * @param result - The result returned from the check method
     */
    async execute(discordUser, role, result) {
        //  note:   this rule is customized to allow for more than one role assignment so we
        //          can ignore the fact that no specific role has been passed in

        let executionResults = [];

        let discordRoles = await this.getDiscordRoles(this.config.roles);

        let qualifiesForSmallRole = false;
        let qualifiesForMediumRole = false;
        let qualifiesForLargeRole = false;

        let smallRoleConfig = this.config.roles.find(
            (r) => r.name === "Kyodai"
        );
        let smallRole = discordRoles.find(
            (r) => r.id === smallRoleConfig.id
        );
        let mediumRoleConfig = this.config.roles.find(
            (r) => r.name === "Shateigashira"
        );
        let mediumRole = discordRoles.find(
            (r) => r.id === mediumRoleConfig.id
        );
        let largeRoleConfig = this.config.roles.find(
            (r) => r.name === "Wakagashira"
        );
        let largeRole = discordRoles.find(
            (r) => r.id === largeRoleConfig.id
        );

        //let roleCount = await this.getRoleCount(kiwamiRole.id);
        //let roleAvail = (roleCount < this.maxCount);
        let roleAvail = true;

        try {
            qualifiesForSmallRole = result.kiwami > 0;
            await this.manageRoles(discordUser, smallRole, qualifiesForSmallRole, roleAvail);
            executionResults.push({
                role: "Kyodai",
                roleId: smallRole.id,
                qualified: qualifiesForSmallRole,
                roleAvailable: roleAvail,
                result: {
                    kiwami: result.kiwami
                },
            });
        } catch (err) {
            logger.error(err.message);
            logger.error(err.stack);
        }
        try {
            qualifiesForMediumRole = result.kiwami > 10;
            await this.manageRoles(discordUser, mediumRole, qualifiesForMediumRole, roleAvail);
            executionResults.push({
                role: "Shateigashira",
                roleId: mediumRole.id,
                qualified: qualifiesForMediumRole,
                roleAvailable: roleAvail,
                result: {
                    kiwami: result.kiwami
                },
            });
        } catch (err) {
            logger.error(err.message);
            logger.error(err.stack);
        }
        try {
            qualifiesForLargeRole = result.kiwami > 25;
            await this.manageRoles(discordUser, largeRole, qualifiesForLargeRole, roleAvail);
            executionResults.push({
                role: "Wakagashira",
                roleId: largeRole.id,
                qualified: qualifiesForLargeRole,
                roleAvailable: roleAvail,
                result: {
                    kiwami: result.kiwami
                },
            });
        } catch (err) {
            logger.error(err.message);
            logger.error(err.stack);
        }

        return executionResults;
    }

    async check(user) {
        const provider = await getProvider();
        let kiwamiResult = await this.getKiwamis(
            this.config.KiwamiContract,
            user,
            provider
        );

        let result = {
            kiwami: kiwamiResult
        };
        return result;
    }

    async getRoleCount(roleID) {
        let guild = discordBot.getGuild();
        //let members = await guild.members.fetch();
        let memberCount = await guild.roles.cache.get(roleID).members.size;

        return memberCount;
    }

    async getDiscordRoles(rolesConfig) {
        let guild = discordBot.getGuild();
        let roles = [];
        //retrieve each of the discord roles defined in the config
        await rolesConfig.forEachAsync(async (r) => {
            let role = await guild.roles.fetch(r.id, { force: true });
            if (!role) {
                logger.error(
                    `Could not find the role id configured for ${r.name}. Please confirm your configuration.`
                );
                return;
            }
            roles.push(role);
        });

        return roles;
    }

    async getKiwamis(config, user, provider) {
        let logMessage = `Kiwami Verification Rule is executing - Get Kiwamis:
Contract:       ${config.Address}
Argument(s):    ${user.walletAddress}`;

        if (!user.walletAddress) {
            logMessage += `
Wallet Address is null/empty. Skipping check against contract and returning 0.`;
            logger.info(logMessage);
            return 0;
        }

        const contract = new Contract(config.Address, config.ABI, provider);

        const result = await contract.balanceOf(user.walletAddress);

        logMessage += `
Result:       ${result}`;
        logger.info(logMessage);

        //return result.toNumber() > 0 ? [1] : []; // quickfix as we dont get tokenIds
        
        // I don't know why this wasn't just returning an actual int value...
        return result.toNumber();
    }

    //todo: cleanup return values arent consumed

    async manageRoles(discordUser, role, qualifies, roleAvail) {
        if (!role) {
            logger.error(
                `Could not locate the ${roleName} discord role using id ${roleId} specified. Please confirm your configuration.`
            );
            return false;
        }

        try {
            if (qualifies) {
                if (roleAvail) {
                    if (!discordUser.roles.cache.has(role.id)) {
                        logger.info(`Assigning Role: ${role.name}`);
                        await discordUser.roles.add(role);
                    }
                    return true;
                }
                else {
                    logger.error(`There are already ${this.maxCount} users with the ${role.name} role.`);
                }
            } else {
                if (discordUser.roles.cache.has(role.id)) {
                    logger.info(`Removing Role: ${role.name}`);
                    await discordUser.roles.remove(role);
                }
                return false;
            }
        } catch (err) {
            logger.error(err.message);
            logger.error(err.stack)
        }
    }
}

module.exports = KiwamiVerificationRule;