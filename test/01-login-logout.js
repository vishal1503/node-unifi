/* global describe, it, beforeEach */
/* eslint-disable import/no-unassigned-import, capitalized-comments */

require('should');
const unifi = require('../unifi.js');

let CONTROLLER_IP = '127.0.0.1';
if (process.env.CONTROLLER_IP) {
  CONTROLLER_IP = process.env.CONTROLLER_IP;
}

let CONTROLLER_PORT = 8443;
if (process.env.CONTROLLER_PORT) {
  CONTROLLER_PORT = process.env.CONTROLLER_PORT;
}

let CONTROLLER_USER = 'ubnt';
if (process.env.CONTROLLER_USER) {
  CONTROLLER_USER = process.env.CONTROLLER_USER;
}

let CONTROLLER_PASS = 'ubnt';
if (process.env.CONTROLLER_PASS) {
  CONTROLLER_PASS = process.env.CONTROLLER_PASS;
}

// Run the tests
describe('Running tests', () => {
  // Slow down tests a bit to get the unifi controller time to
  // process
  beforeEach(async () => {
    await new Promise(resolve => {
      setTimeout(resolve, 500);
    });
  });

  const controller = new unifi.Controller({host: CONTROLLER_IP, port: CONTROLLER_PORT, sslverify: false});

  // LOGIN
  it('login()', async done => {
    if (controller === null) {
      done(new Error('uninitialized controller'));
    } else {
      try {
        await controller.login(CONTROLLER_USER, CONTROLLER_PASS);
        done();
      } catch (error) {
        done(error);
      }
    }
  });

  // GET SITE SYSINFO
  it('getSiteSysinfo()', async done => {
    try {
      const sysinfo = await controller.getSiteSysinfo();
      if (typeof (sysinfo) === 'undefined' || sysinfo.length <= 0) {
        done(new Error('getSiteSysinfo(): ' + JSON.stringify(sysinfo)));
      } else {
        console.log(`      UniFi-Controller: ${sysinfo[0].version} (${sysinfo[0].build})`);
        sysinfo[0].timezone.should.equal('Europe/Berlin');
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET SITE STATS
  let defaultSiteID = null;
  it('getSitesStats()', async done => {
    try {
      const sites = await controller.getSitesStats();
      if (typeof (sites) === 'undefined' || sites.length <= 0) {
        done(new Error('getSitesStats(): ' + JSON.stringify(sites)));
      } else {
        sites[0].name.should.equal('default');
        sites[0].desc.should.equal('Default');
        defaultSiteID = sites[0]._id;
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // AUTHORIZE GUEST
  it('authorizeGuest()', async done => {
    try {
      const result = await controller.authorizeGuest('aa:bb:CC:DD:EE:FF', 100, 20, 30, 40, 'aa:bb:cc:dd:ee:fa');
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('authorizeGuest(): ' + JSON.stringify(result)));
      } else {
        result[0].mac.should.equal('aa:bb:cc:dd:ee:ff');
        result[0].end.should.aboveOrEqual(result[0].start + (100 * 60));
        result[0].end.should.belowOrEqual(result[0].start + (140 * 60));
        result[0].qos_rate_max_up.should.equal(20);
        result[0].qos_rate_max_down.should.equal(30);
        result[0].qos_usage_quota.should.equal(40);
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // UN-AUTHORIZE GUEST
  it('unauthorizeGuest()', async done => {
    try {
      const result = await controller.unauthorizeGuest('aa:bb:CC:DD:EE:FF');
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('unauthorizeGuest(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // RE-CONNECT CLIENT
  /* WONTWORK: requires active AP connection
  it('reconnectClient()', async done => {
    try {
      const result = await controller.reconnectClient('aa:bb:CC:DD:EE:FF');
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('reconnectClient(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });
  */

  // Block a client device
  it('blockClient()', async done => {
    try {
      const result = await controller.blockClient('aa:bb:CC:DD:EE:FF');
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('blockClient(): ' + JSON.stringify(result)));
      } else {
        result[0].mac.should.equal('aa:bb:cc:dd:ee:ff');
        result[0].blocked.should.equal(true);
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // List blocked client devices
  it('getBlockedUsers()', async done => {
    try {
      const result = await controller.getBlockedUsers();
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('getBlockedUsers(): ' + JSON.stringify(result)));
      } else {
        result[0].mac.should.equal('aa:bb:cc:dd:ee:ff');
        result[0].blocked.should.equal(true);
        result[0].name.should.equal('Testdevice');
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Unblock a client device
  it('unblockClient()', async done => {
    try {
      const result = await controller.unblockClient('aa:bb:CC:DD:EE:FF');
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('unblockClient(): ' + JSON.stringify(result)));
      } else {
        result[0].mac.should.equal('aa:bb:cc:dd:ee:ff');
        result[0].blocked.should.equal(false);
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Create user group
  let testGroupID = null;
  let dummyGroupID = null;
  it('createUserGroup()', async done => {
    try {
      const result = await controller.createUserGroup('Testgroup');
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('createUserGroup(): ' + JSON.stringify(result)));
      } else {
        result[0].name.should.equal('Testgroup');
        result[0].qos_rate_max_down.should.equal(-1);
        testGroupID = result[0]._id;

        // console.log(JSON.stringify(result));
        const result = await controller.createUserGroup('DUMMYgroup');
        if (typeof (result) === 'undefined' || result.length <= 0) {
          done(new Error('createUserGroup(DUMMYgroup): ' + JSON.stringify(result)));
        } else {
          result[0].name.should.equal('DUMMYgroup');
          result[0].qos_rate_max_down.should.equal(-1);
          dummyGroupID = result[0]._id;
          // console.log(JSON.stringify(result));
          done();
        }
      }
    } catch (error) {
      done(error);
    }
  });

  // Delete user group
  it('deleteUserGroup()', async done => {
    try {
      const result = await controller.deleteUserGroup(dummyGroupID);
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('deleteUserGroup(): ' + JSON.stringify(result)));
      } else {
        dummyGroupID = null;
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Edit user group
  it('editUserGroup()', async done => {
    try {
      const result = await controller.editUserGroup(testGroupID, defaultSiteID, 'Testgroup', 100, 200);
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('editUserGroup(): ' + JSON.stringify(result)));
      } else {
        result[0].name.should.equal('Testgroup');
        result[0].qos_rate_max_down.should.equal(100);
        result[0].qos_rate_max_up.should.equal(200);
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // List user groups
  let defaultGroupID = null;
  it('getUserGroups()', async done => {
    try {
      const result = await controller.getUserGroups();
      if (typeof (result) === 'undefined' || result.length < 2) {
        done(new Error('getUserGroups(): ' + JSON.stringify(result)));
      } else {
        result[0].name.should.equal('Default');
        result[0].attr_no_delete.should.equal(true);
        result[1].name.should.equal('Testgroup');
        result[1].qos_rate_max_down.should.equal(100);
        result[1].qos_rate_max_up.should.equal(200);
        defaultGroupID = result[0]._id;
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Create a new user/client-device
  let createdUserID = null;
  it('createUser()', async done => {
    try {
      const result = await controller.createUser('FF:EE:DD:CC:bb:aa', defaultGroupID, 'createUserTest', 'createUserTest note', true, false);
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('createUser(): ' + JSON.stringify(result)));
      } else if (typeof (result[0].meta.msg) === 'undefined') {
        result[0].meta.rc.should.equal('ok');
        result[0].data[0].mac.should.equal('ff:ee:dd:cc:bb:aa');
        result[0].data[0].name.should.equal('createUserTest');
        result[0].data[0].note.should.equal('createUserTest note');
        result[0].data[0].is_wired.should.equal(true);
        result[0].data[0].is_guest.should.equal(false);
        result[0].data[0].usergroup_id.should.equal('');
        createdUserID = result[0].data[0]._id;
        // console.log(JSON.stringify(result));
        done();
      } else {
        done(result[0].meta.msg);
      }
    } catch (error) {
      done(error);
    }
  });

  // Assign client device to another group
  it('setUserGroup()', async done => {
    try {
      const result = await controller.setUserGroup(createdUserID, testGroupID);
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('setUserGroup(): ' + JSON.stringify(result)));
      } else {
        result[0].note.should.equal('createUserTest note');
        result[0].name.should.equal('createUserTest');
        result[0].mac.should.equal('ff:ee:dd:cc:bb:aa');
        result[0].is_wired.should.equal(true);
        result[0].is_guest.should.equal(false);
        result[0]._id.should.equal(createdUserID);
        result[0].usergroup_id.should.equal(testGroupID);
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Fetch AP groups
  it('getAPGroups()', async done => {
    try {
      const result = await controller.getAPGroups();
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('getAPGroups(): ' + JSON.stringify(result)));
      } else {
        result[0].name.should.equal('All APs');
        result[0].attr_no_delete.should.equal(true);
        result[0].attr_hidden_id.should.equal('default');
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Update client fixedip
  /* WONTWORK: Needs some active device
  it('editClientFixedIP()', async done => {
    try {
      const result = await controller.editClientFixedIP(createdUserID, true, null, '192.168.1.1');
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('editClientFixedIP(): ' + JSON.stringify(result)));
      } else {
        console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });
  */

  // Add/modify/remove a client device not
  it('setClientNote()', async done => {
    try {
      const result = await controller.setClientNote(createdUserID, 'createUserTest note changed');
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('setClientNote(): ' + JSON.stringify(result)));
      } else {
        result[0].note.should.equal('createUserTest note changed');
        result[0].name.should.equal('createUserTest');
        result[0].mac.should.equal('ff:ee:dd:cc:bb:aa');
        result[0].is_wired.should.equal(true);
        result[0].is_guest.should.equal(false);
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Add/modify/remove a client device not
  it('setClientName()', async done => {
    try {
      const result = controller.setClientName(createdUserID, 'createUserTest changed');
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('setClientName(): ' + JSON.stringify(result)));
      } else {
        result[0].note.should.equal('createUserTest note changed');
        result[0].name.should.equal('createUserTest changed');
        result[0].mac.should.equal('ff:ee:dd:cc:bb:aa');
        result[0].is_wired.should.equal(true);
        result[0].is_guest.should.equal(false);
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // 5 minutes site stats method
  it('get5minSiteStats()', async done => {
    try {
      const result = await controller.get5minSiteStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('get5minSiteStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Hourly site stats method
  it('getHourlySiteStats()', async done => {
    try {
      const result = await controller.getHourlySiteStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getHourlySiteStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Daily site stats method
  it('getDailySiteStats()', async done => {
    try {
      const result = controller.getDailySiteStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getDailySiteStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Monthly site stats method
  it('getMonthlySiteStats()', async done => {
    try {
      const result = await controller.getMonthlySiteStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getMonthlySiteStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // 5 minutes stats method for a single access point or all access points
  it('get5minApStats()', async done => {
    try {
      const result = await controller.get5minApStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('get5minApStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Hourly stats method for a single access point or all access points
  it('getHourlyApStats()', async done => {
    try {
      const result = await controller.getHourlyApStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getHourlyApStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Daily stats method for a single access point or all access points
  it('getDailyApStats()', async done => {
    try {
      const result = await controller.getDailyApStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getDailyApStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Monthly stats method for a single access point or all access points
  it('getMonthlyApStats()', async done => {
    try {
      const result = await controller.getMonthlyApStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getMonthlyApStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // 5 minutes stats method for a single user/client device
  it('get5minUserStats()', async done => {
    try {
      const result = await controller.get5minUserStats('ff:ee:dd:cc:bb:aa');
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('get5minUserStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Hourly stats method for a a single user/client device
  it('getHourlyUserStats()', async done => {
    try {
      const result = await controller.getHourlyUserStats('ff:ee:dd:cc:bb:aa');
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getHourlyUserStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Daily stats method for a single user/client device
  it('getDailyUserStats()', async done => {
    try {
      const result = await controller.getDailyUserStats('ff:ee:dd:cc:bb:aa');
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getDailyUserStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Monthly stats method for a single user/client device
  it('getMonthlyUserStats()', async done => {
    try {
      const result = await controller.getMonthlyUserStats('ff:ee:dd:cc:bb:aa');
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getMonthlyUserStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // 5 minutes gateway stats method
  it('get5minGatewayStats()', async done => {
    try {
      const result = await controller.get5minGatewayStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('get5minGatewayStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Hourly gateway stats method
  it('getHourlyGatewayStats()', async done => {
    try {
      const result = await controller.getHourlyGatewayStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getHourlyGatewayStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Daily gateway stats method
  it('getDailyGatewayStats()', async done => {
    try {
      const result = await controller.getDailyGatewayStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getDailyGatewayStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Monthly gateway stats method
  it('getMonthlyGatewayStats()', async done => {
    try {
      const result = await controller.getMonthlyGatewayStats();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getMonthlyGatewayStats(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Method to fetch speed test results
  it('getSpeedTestResults()', async done => {
    try {
      const result = await controller.getSpeedTestResults();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getSpeedTestResults(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Method to fetch IPS/IDS event
  it('getIPSEvents()', async done => {
    try {
      const result = await controller.getIPSEvents();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getIPSEvents(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Show all login sessions
  it('getSessions()', async done => {
    try {
      const result = await controller.getSessions();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getSessions(): ' + JSON.stringify(result)));
      } else {
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Show latest 'n' login sessions for a single client device
  it('getLatestSessions()', async done => {
    try {
      const result = await controller.getLatestSessions('ff:ee:dd:cc:bb:aa');
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getLatestSessions(): ' + JSON.stringify(result)));
      } else {
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Show all authorizations
  it('getAllAuthorizations()', async done => {
    try {
      const result = await controller.getAllAuthorizations();
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('getAllAuthorizations(): ' + JSON.stringify(result)));
      } else {
        result[0].mac.should.equal('aa:bb:cc:dd:ee:ff');
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Forget one or more client devices
  it('forgetClient()', async done => {
    try {
      const result = await controller.forgetClient(['aa:bb:cc:dd:ee:ff', 'FF:EE:DD:CC:bb:aa']);
      if (typeof (result) === 'undefined') {
        done(new Error('forgetClient(): ' + JSON.stringify(result)));
      } else {
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // Fetch guest devices
  it('getGuests()', async done => {
    try {
      const result = await controller.getGuests();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getGuests(): ' + JSON.stringify(result)));
      } else {
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET CLIENT DEVICES
  it('getClientDevices()', async done => {
    try {
      const result = await controller.getClientDevices();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getClientDevices(): ' + JSON.stringify(result)));
      } else {
        // console.log(JSON.stringify(result);
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET CLIENT DEVICE
  /* WONTWORK: No active client device
  it('getClientDevice()', async done => {
    try {
      const result = await controller.getClientDevice();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getClientDevice(): ' + JSON.stringify(result)));
      } else {
        console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });
  */

  // GET ALL USERS EVER CONNECTED
  it('getAllUsers()', async done => {
    try {
      const result = await controller.getAllUsers();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getAllUsers(): ' + JSON.stringify(result)));
      } else {
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET ALL ACCESS DEVICES
  it('getAccessDevices()', async done => {
    try {
      const result = await controller.getAccessDevices();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getAccessDevices(): ' + JSON.stringify(result)));
      } else {
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET ALL SESSIONS
  it('getSessions()', async done => {
    try {
      const result = await controller.getSessions();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getSessions(): ' + JSON.stringify(result)));
      } else {
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET USERS
  it('getUsers()', async done => {
    try {
      const result = await controller.getUsers();
      if (typeof (result) === 'undefined' || result.length < 0) {
        done(new Error('getUsers(): ' + JSON.stringify(result)));
      } else {
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET SELF
  it('getSelf()', async done => {
    try {
      const result = await controller.getSelf();
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('getSelf(): ' + JSON.stringify(result)));
      } else {
        result[0].email.should.equal('demo@ubnt.com');
        result[0].site_role.should.equal('admin');
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET STATUS
  it('getStatus()', async done => {
    try {
      const result = await controller.getStatus();
      if (typeof (result) === 'undefined') {
        done(new Error('getStatus(): ' + JSON.stringify(result)));
      } else {
        // console.log(JSON.stringify(result));
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET FULL STATUS
  it('getFullStatus()', async done => {
    try {
      const result = await controller.getFullStatus();
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('getFullStatus(): ' + JSON.stringify(result)));
      } else {
        result.meta.rc.should.equal('ok');
        result.meta.up.should.equal(true);
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // GET DEVICE NAME MAPPINGS
  it('getDeviceNameMappings()', async done => {
    try {
      const result = await controller.getDeviceNameMappings();
      if (typeof (result) === 'undefined' || result.length <= 0) {
        done(new Error('getDeviceNameMappings(): ' + JSON.stringify(result)));
      } else {
        result.BZ2.base_model.should.equal('BZ2');
        done();
      }
    } catch (error) {
      done(error);
    }
  });

  // LOGOUT
  it('logout()', async done => {
    try {
      await controller.logout();
      done();
    } catch (error) {
      done(error);
    }
  });
});
