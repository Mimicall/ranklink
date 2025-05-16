const axios = require('axios');
const noblox = require("noblox.js");

async function getUserRankInGroup(groupId, userId) {
    try {
        let res = await noblox.getRankInGroup(groupId, userId);
        return res;
    } catch(e) {
        console.error(e);
    }
}

async function getUserRankNameInGroup(groupId, userId) {
    try {
        let res = await noblox.getRankNameInGroup(groupId, userId);
        return res;
    } catch(e) {
        console.error(e);
    }
}

async function setUserRankInGroup(groupId, userId, rank) {
    try {
        await noblox.setRank(groupId, userId, rank);
    } catch (error) {
        console.error(error);
    }
}

async function getUserData(userId) {
    try {
        let data = await noblox.getUserInfo(userId);
        return data;
    } catch(e) {
        console.error(e);
    }
}

async function getIdFromUsername(username) {
    try {
        let id = await noblox.getIdFromUsername(username);
        return id;
    } catch (e) {
        console.error(e);
    }
}

async function getGroupList(userId) {
    try {
        let groups = await noblox.getGroups(userId);
        return groups;
    } catch (error) {
        console.error(error);
    }
}

async function getGroupInfo(groupId) {
    try {
        let group = await noblox.getGroup(groupId);
        return group;
    } catch(e) {
        console.error(e);
    }
}

async function checkRolePermissions(groupId, rolesetId) {
    try {
        let permissions = await noblox.getRolePermissions(groupId, rolesetId);
        return permissions;
    } catch(e) {
        console.error(e);
    }
}

async function checkBotPermissions(groupId) {
    try {
        let user = await noblox.getAuthenticatedUser();
        let roleName = await getUserRankNameInGroup(groupId, user.id);
        let roleInfo = await getRole(groupId, roleName);
        let permissions = await checkRolePermissions(groupId, roleInfo.id);
        return permissions.groupMembershipPermissions.changeRank;
    } catch(e) {
        console.error(e);
        return false;
    }
}

async function getRole(groupId, roleName) {
    try {
        let roleInfo = await noblox.getRole(groupId, roleName);
        return roleInfo;
    } catch (error) {
        console.error(error);
    }
}

async function getRoles(groupId) {
    try {
        let role = await noblox.getRoles(groupId);
        return role;
    } catch (e) {
        console.error(e);
    }
}

async function getXsrfToken() {
  try {
    await axios.post(
      'https://auth.roblox.com/v2/logout',
      {},
      { headers: { Cookie: `.ROBLOSECURITY=${ROBLOX_COOKIE}` } }
    );
  } catch (err) {
    const token = err.response.headers['x-csrf-token'];
    return token;
  }
}

// async function start() {
//     let name = await getUserRankNameInGroup(35720216, 8459054816);
//     let role = await getRole(35720216, name);
//     let permissions = await checkRolePermissions(35720216, role.id);
//     console.log(permissions);
// }

// start()

module.exports = {
    setUserRankInGroup,
    getUserRankInGroup,
    getUserRankNameInGroup,
    getIdFromUsername,
    getUserData,
    getGroupList,
    getRole,
    getRoles,
    checkRolePermissions,
    checkBotPermissions
}