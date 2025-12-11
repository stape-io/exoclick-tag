const BigQuery = require('BigQuery');
const computeEffectiveTldPlusOne = require('computeEffectiveTldPlusOne');
const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const getCookieValues = require('getCookieValues');
const getContainerVersion = require('getContainerVersion');
const getEventData = require('getEventData');
const getRequestHeader = require('getRequestHeader');
const getTimestampMillis = require('getTimestampMillis');
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
    log({
      Name: 'ExoClick',
      Type: 'Message',
      EventName: 'Conversion',
      Message:
        'No Click ID found. ' +
        (data.cookieSync
          ? '3rd party cookie-syncing requests will try to be sent as fallback.'
          : 'Aborting.')
    });
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

  log({
    Name: 'ExoClick',
    Type: 'Request',
    EventName: 'Conversion',
    RequestMethod: requestOptions.method,
    RequestUrl: requestUrl
  });

  return sendHttpRequest(requestUrl, requestOptions)
    .then((response) => {
      log({
        Name: 'ExoClick',
        Type: 'Response',
        EventName: 'Conversion',
        ResponseStatusCode: response.statusCode,
        ResponseHeaders: response.headers,
        ResponseBody: response.body
      });

      if (!data.useOptimisticScenario) {
        const responseBody = response.body || '';
        if (responseBody.match('OK')) {
          return data.gtmOnSuccess();
        } else if (responseBody.match('ERROR: Tag is invalid') && data.cookieSync) {
          log({
            Name: 'ExoClick',
            Type: 'Message',
            EventName: 'Conversion',
            Message:
              'Click ID is invalid. 3rd party cookie-syncing requests will try to be sent as fallback.',
            Reason: responseBody
          });
          return sendCookieSyncPixel(conversionParametersForCookieSync)
            ? data.gtmOnSuccess()
            : data.gtmOnFailure();
        } else {
          return data.gtmOnFailure();
        }
      }
    })
    .catch((error) => {
      log({
        Name: 'ExoClick',
        Type: 'Message',
        EventName: 'Conversion',
        Message: 'API call failed or timed out',
        Reason: JSON.stringify(error)
      });
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
        'The requestor does not support sending pixels from browser. 3rd party cookies will not be collected as a result.'
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
  return valueType !== 'null' && valueType !== 'undefined' && value !== '';
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
  const logDestinationsHandlers = {};
  if (determinateIsLoggingEnabled()) logDestinationsHandlers.console = logConsole;
  if (determinateIsLoggingEnabledForBigQuery()) logDestinationsHandlers.bigQuery = logToBigQuery;

  rawDataToLog.TraceId = getRequestHeader('trace-id');

  const keyMappings = {
    // No transformation for Console is needed.
    bigQuery: {
      Name: 'tag_name',
      Type: 'type',
      TraceId: 'trace_id',
      EventName: 'event_name',
      RequestMethod: 'request_method',
      RequestUrl: 'request_url',
      RequestBody: 'request_body',
      ResponseStatusCode: 'response_status_code',
      ResponseHeaders: 'response_headers',
      ResponseBody: 'response_body'
    }
  };

  for (const logDestination in logDestinationsHandlers) {
    const handler = logDestinationsHandlers[logDestination];
    if (!handler) continue;

    const mapping = keyMappings[logDestination];
    const dataToLog = mapping ? {} : rawDataToLog;

    if (mapping) {
      for (const key in rawDataToLog) {
        const mappedKey = mapping[key] || key;
        dataToLog[mappedKey] = rawDataToLog[key];
      }
    }

    handler(dataToLog);
  }
}

function logConsole(dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
}

function logToBigQuery(dataToLog) {
  const connectionInfo = {
    projectId: data.logBigQueryProjectId,
    datasetId: data.logBigQueryDatasetId,
    tableId: data.logBigQueryTableId
  };

  dataToLog.timestamp = getTimestampMillis();

  ['request_body', 'response_headers', 'response_body'].forEach((p) => {
    dataToLog[p] = JSON.stringify(dataToLog[p]);
  });

  BigQuery.insert(connectionInfo, [dataToLog], { ignoreUnknownValues: true });
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}

function determinateIsLoggingEnabledForBigQuery() {
  if (data.bigQueryLogType === 'no') return false;
  return data.bigQueryLogType === 'always';
}
