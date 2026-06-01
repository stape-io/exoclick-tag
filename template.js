const computeEffectiveTldPlusOne = require('computeEffectiveTldPlusOne');
const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const getCookieValues = require('getCookieValues');
const getEventData = require('getEventData');
const getRequestHeader = require('getRequestHeader');
const getType = require('getType');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const makeInteger = require('makeInteger');
const makeString = require('makeString');
const parseUrl = require('parseUrl');
const sendHttpRequest = require('sendHttpRequest');
const sendPixelFromBrowser = require('sendPixelFromBrowser');
const setCookie = require('setCookie');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

if (checkGuardClauses(data, eventData)) return;

if (data.type === 'pageview') return storeClickId(data, eventData);
else {
  sendConversion(data, eventData);
}

if (data.useOptimisticScenario) {
  return data.gtmOnSuccess();
}

/*==============================================================================
  Vendor related functions
==============================================================================*/

function sendConversion(data, eventData) {
  const goal = data.conversionId;
  const clickId = getClickId(data, eventData);
  const value = data.conversionValue;

  let conversionParameters = '?goal=' + enc(goal);
  if (isValidValue(value)) conversionParameters += '&value=' + enc(value);
  const conversionParametersForCookieSync = conversionParameters;
  conversionParameters += '&tag=' + enc(clickId);

  if (!clickId) {
    if (data.cookieSync) {
      return sendCookieSyncPixel(conversionParametersForCookieSync)
        ? data.gtmOnSuccess()
        : data.gtmOnFailure();
    } else {
      return data.gtmOnFailure();
    }
  }

  const requestUrl = 'https://s.magsrv.com/tag.php' + conversionParameters;
  const requestOptions = {
    method: 'GET'
  };

  return sendHttpRequest(requestUrl, requestOptions)
    .then((response) => {
      if (!data.useOptimisticScenario) {
        const responseBody = response.body || '';
        if (responseBody.match('OK')) {
          return data.gtmOnSuccess();
        } else if (responseBody.match('ERROR: Tag is invalid') && data.cookieSync) {
          return sendCookieSyncPixel(conversionParametersForCookieSync)
            ? data.gtmOnSuccess()
            : data.gtmOnFailure();
        } else {
          return data.gtmOnFailure();
        }
      }
    })
    .catch((error) => {
      if (!data.useOptimisticScenario) return data.gtmOnFailure();
    });
}

function parseClickIdFromUrl(data, eventData) {
  const url = eventData.page_location || getRequestHeader('referer');
  if (!url) return;

  const urlSearchParams = parseUrl(url).searchParams;
  return urlSearchParams[data.clickIdKey];
}

function getClickId(data, eventData) {
  const clickId = data.hasOwnProperty('clickId')
    ? data.clickId
    : parseClickIdFromUrl(data, eventData) || getCookieValues('_exoclick_cid')[0];

  return clickId;
}

function storeClickId(data, eventData) {
  const clickId = parseClickIdFromUrl(data, eventData);
  if (clickId) {
    const cookieOptions = {
      domain: getCookieDomain(data),
      samesite: data.cookieSameSite || 'none',
      path: '/',
      secure: true,
      httpOnly: !!data.cookieHttpOnly,
      'max-age': 60 * 60 * 24 * (makeInteger(data.cookieExpiration) || 365)
    };
    setCookie('_exoclick_cid', clickId, cookieOptions, false);
  }

  return data.gtmOnSuccess();
}

function sendCookieSyncPixel(conversionParametersForCookieSync) {
  const syncingDomainAliases = [
    's.chmsrv.com',
    's.chnsrv.com',
    's.ds10lf.com',
    's.ds165z.com',
    's.eln7dc.com',
    's.opoxv.com',
    's.orbsrv.com',
    's.pemsrv.com',
    's.zlinkw.com',
    's.magsrv.com',
    'syndication.realsrv.com'
  ];
  let allSendPixelWereSuccessful = true;
  syncingDomainAliases.forEach((alias) => {
    const url = 'https://' + alias + '/tag.php' + conversionParametersForCookieSync;
    if (!sendPixelFromBrowser(url)) allSendPixelWereSuccessful = false;
  });

  if (!allSendPixelWereSuccessful) {
    log({
      Name: 'ExoClick',
      Type: 'Message',
      EventName: 'Conversion',
      Message:
        '⚠️ [WARNING] The requestor does not support sending pixels from browser. 3rd party cookies will not be collected as a result.'
    });
  }

  return allSendPixelWereSuccessful;
}

/*==============================================================================
  Helpers
==============================================================================*/

function checkGuardClauses(data, eventData) {
  const url = eventData.page_location || getRequestHeader('referer');

  if (!isConsentGivenOrNotRequired(data, eventData)) {
    data.gtmOnSuccess();
    return true;
  }

  if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) {
    data.gtmOnSuccess();
    return true;
  }
}

function isValidValue(value) {
  const valueType = getType(value);
  return valueType !== 'null' && valueType !== 'undefined' && value !== '' && value === value;
}

function getCookieDomain(data) {
  return !data.cookieDomain || data.cookieDomain === 'auto'
    ? computeEffectiveTldPlusOne(getEventData('page_location') || getRequestHeader('referer')) ||
        'auto'
    : data.cookieDomain;
}

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
}

function isConsentGivenOrNotRequired(data, eventData) {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}

function log(rawDataToLog) {
  rawDataToLog.TraceId = getRequestHeader('trace-id');
  logToConsole(JSON.stringify(rawDataToLog));
}
