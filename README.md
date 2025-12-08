# Exoclick Tag for GTM Server-Side

This server-side tag allows you to track Exoclick conversions via server-to-server (S2S) postbacks directly from your Google Tag Manager Server container.

## Features

- **Conversion Tracking**: Sends conversion data to Exoclick using Goal IDs and Click IDs.
- **Value Flexibility**: Supports both **Fixed** (configured in Exoclick) and **Dynamic** (passed via variable) conversion values.
- **Optimistic Scenario**: Option to trigger `gtmOnSuccess()` immediately without waiting for the API response to speed up response times.
- **Consent Checks**: Built-in support for checking `ad_storage` consent before execution.
- **BigQuery Logging**: Native support for streaming request and response data to BigQuery.

## Configuration

### 1. Conversion Data

- **Goal ID**: Enter the Goal ID found in your Exoclick Conversion Tracking tab.
- **Click ID**: Enter the unique Click ID. This usually carries the value of the `{conversion_tracking}` or `tag` parameter from your landing page URL.
- **Conversion Value**:
  - **Fixed Value**: Select if the goal value is set within Exoclick.
  - **Dynamic Value**: Select to map a specific numeric value from your event data.
- **Use Optimistic Scenario**: Check to fire the tag success trigger regardless of the actual API result.

### 2. Tag Execution Consent Settings

- **Ad Storage Consent**: Choose "Send data in case marketing consent given" to abort execution if `ad_storage` is not granted.

### 3. Logs Settings

- **Logs Settings**: Options to log to console "Always", "Never", or during "Debug and preview".
- **BigQuery Logs**: Enable to log full event data to a BigQuery table.
  - **Project ID**: Defaults to the environment variable `GOOGLE_CLOUD_PROJECT` if left empty.
  - **Dataset ID**: Required.
  - **Table ID**: Required.

## Permissions

This template requires the following permissions:

- **Access to Global Variables**: Reads event data and container version.
- **Send HTTP Requests**: Grants access to `https://s.magsrv.com/`.
- **Access BigQuery**: Requires `write` access if BigQuery logging is enabled.
