/**
 * Ginger & Gleam — Google Apps Script backend
 * Paste this whole file into Extensions → Apps Script inside the "Ginger & Gleam" Google Sheet.
 * Then: Run → setup (once, authorize when asked), then Deploy → New deployment → Web app,
 * Execute as: Me, Who has access: Anyone. Copy the Web app URL into the app's Settings screen.
 *
 * What it does:
 *  - setup(): creates the tabs the app and the operator share, with headers and default pricing.
 *  - doGet():  returns pricing, clients, snippets, photos, payments as JSON (the app loads these).
 *  - doPost(): accepts one record at a time from the app and appends it to the right tab.
 *              Photos arrive as base64, are saved to Drive under "Ginger & Gleam Photos/<Client>/",
 *              and a row with the Drive link is added to the Photos tab.
 */

var PHOTO_ROOT = 'Ginger & Gleam Photos';

var TABS = {
  Clients:   ['Added','Name','Phone','Address','Neighborhood','Beds','Baths','SqFt','Frequency','Rate','DayTime','Entry','Pets','Surfaces','Products','NeverTouch','Arrival','OneThing','PhotoOK','Notes','Source','Status'],
  Quotes:    ['Date','Name','Phone','Neighborhood','Beds','Baths','SqFt','Frequency','Pets','ExtraBaths','AddOns','Adjust','FirstVisit','Recurring','QuoteText','Outcome'],
  Checklists:['Date','Client','Type','Done','Total','Skipped','Minutes','Notes'],
  Payments:  ['Date','Client','Service','Amount','Method','Paid','PaidDate','Note'],
  Photos:    ['Date','Client','Stage','Room','FileName','DriveUrl','FileId','Note'],
  Pricing:   ['Key','Label','Value','Notes'],
  Snippets:  ['Key','Title','Text']
};

var DEFAULT_PRICING = [
  ['curve_base','Recurring base (per visit)',75,'Biweekly = base + per_sqft x sq ft. Fit to Shannon\'s real prices Oct 2026'],
  ['curve_per_sqft','Recurring per sq ft',0.09,''],
  ['mult_weekly','Weekly multiplier',0.88,'x biweekly'],
  ['mult_biweekly','Biweekly multiplier',1,''],
  ['mult_monthly','Monthly multiplier',1.2,''],
  ['mult_first','First Visit multiplier',1.7,'x biweekly'],
  ['mult_moveout','Move-out multiplier',2.2,'x biweekly'],
  ['round_to','Round prices to',5,'dollars'],
  ['hourly','Hourly rate',75,'2-hour minimum'],
  ['minimum','Minimum visit',150,''],
  ['adj_pets','Shedding pets, per visit',25,''],
  ['adj_extra_bath','Each bathroom beyond 1 per 1,000 sq ft',20,''],
  ['adj_heavy_low','Heavy build-up (low)',75,'First Visit only'],
  ['adj_heavy_high','Heavy build-up (high)',150,'First Visit only'],
  ['adj_extra_space','Casita / basement / detached office',50,''],
  ['addon_oven','Inside oven',40,'included in First Visit and move-out'],
  ['addon_fridge','Inside refrigerator',40,'included in First Visit and move-out'],
  ['addon_windows_room','Interior windows, per room',25,''],
  ['addon_blinds_room','Blinds, per room',20,''],
  ['addon_laundry','Laundry, per load',25,''],
  ['addon_linens','Change linens, per bed',10,''],
  ['addon_cabinets','Inside kitchen cabinets',75,''],
  ['addon_garage','Garage sweep and wipe',50,''],
  ['addon_patio','Patio or porch',40,''],
  ['cancel_fee','Same-day cancellation',50,'waived for true emergencies']
];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function(name){
    var sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); }
    if (sh.getLastRow() === 0) {
      sh.appendRow(TABS[name]);
      sh.getRange(1,1,1,TABS[name].length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  var pr = ss.getSheetByName('Pricing');
  if (pr.getLastRow() <= 1) {
    pr.getRange(2,1,DEFAULT_PRICING.length,4).setValues(DEFAULT_PRICING);
  }
  var root = getOrCreateFolder_(DriveApp.getRootFolder(), PHOTO_ROOT);
  Logger.log('Setup complete. Photo folder: ' + root.getUrl());
  return 'ok';
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'bootstrap';
  var out = {};
  try {
    if (action === 'bootstrap' || action === 'pricing')  out.pricing  = readTab_('Pricing');
    if (action === 'bootstrap' || action === 'clients')  out.clients  = readTab_('Clients');
    if (action === 'bootstrap' || action === 'snippets') out.snippets = readTab_('Snippets');
    if (action === 'bootstrap' || action === 'photos')   out.photos   = readTab_('Photos');
    if (action === 'bootstrap' || action === 'payments') out.payments = readTab_('Payments');
    out.ok = true; out.at = new Date().toISOString();
  } catch (err) { out.ok = false; out.error = String(err); }
  return json_(out);
}

function doPost(e) {
  var out = {};
  try {
    var body = JSON.parse(e.postData.contents);
    var type = body.type, d = body.data || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (type === 'photo') {
      var client = (d.client || 'Unfiled').toString().trim();
      var stamp = d.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      var name = client + ' · ' + stamp + ' · ' + (d.stage || 'Photo') + ' · ' + (d.room || 'Room') + '.jpg';
      var root = getOrCreateFolder_(DriveApp.getRootFolder(), PHOTO_ROOT);
      var folder = getOrCreateFolder_(root, client);
      var bytes = Utilities.base64Decode(d.base64);
      var file = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', name));
      ss.getSheetByName('Photos').appendRow([stamp, client, d.stage||'', d.room||'', name, file.getUrl(), file.getId(), d.note||'']);
      out.url = file.getUrl(); out.folder = folder.getUrl();
    } else if (type === 'client') {
      appendByHeaders_(ss, 'Clients', Object.assign({Added: today_()}, d));
    } else if (type === 'quote') {
      appendByHeaders_(ss, 'Quotes', Object.assign({Date: today_()}, d));
    } else if (type === 'checklist') {
      appendByHeaders_(ss, 'Checklists', Object.assign({Date: today_()}, d));
    } else if (type === 'payment') {
      appendByHeaders_(ss, 'Payments', Object.assign({Date: today_()}, d));
    } else {
      throw new Error('Unknown type: ' + type);
    }
    out.ok = true;
  } catch (err) { out.ok = false; out.error = String(err); }
  return json_(out);
}

/* helpers */
function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function readTab_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var vals = sh.getDataRange().getValues(); var head = vals.shift();
  return vals.filter(function(r){ return r.join('') !== ''; }).map(function(r){
    var o = {}; head.forEach(function(h,i){ o[h] = r[i] instanceof Date ? Utilities.formatDate(r[i], Session.getScriptTimeZone(), 'yyyy-MM-dd') : r[i]; }); return o;
  });
}
function appendByHeaders_(ss, tab, obj) {
  var sh = ss.getSheetByName(tab);
  var head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(head.map(function(h){ var v = obj[h]; return v === undefined || v === null ? '' : v; }));
}
function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
