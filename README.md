# ExoClick Tag for GTM Server-Side

This server-side tag allows you to track [ExoClick conversions](https://docs.exoclick.com/docs/conversion-tracking) via server-to-server (S2S) postbacks and handle Click ID storage directly from your Google Tag Manager Server container.

## Features

- **Event Support**: Handles **Page View** (for storing Click IDs) and **Conversion** (for tracking goals).
- **Cookie Management**: Automatically extracts the Click ID from the URL during a Page View and stores it as a first-party cookie.
- **Cookie Syncing**: Optional feature to fire browser-side pixels to synchronize cookies across ExoClick domains when no Click ID is found in first-party cookie or the Click ID value is invalid.
- **Optimistic Scenario**: Option to trigger `gtmOnSuccess()` immediately without waiting for the API response.

## Configuration

### 1. Event Type

- **Page View**: Fires when a user reaches the landing page to store the Click ID in the `_exoclick_cid` first-party cookie.
  - **Click ID URL Parameter Name**: The query parameter name for your `{conversions_tracking}` token (e.g., `exotracker`).
  - **Cookie Settings**: Define **Expiration** (days), **Domain**, **SameSite** and **HttpOnly** flag for the Click ID cookie.
- **Conversion**: Sends a postback to ExoClick.
  - **Click ID URL Parameter Name**: The query parameter name for your `{conversions_tracking}` token (e.g., `exotracker`).
  - **Goal ID**: Found in the "ID" column of your ExoClick Conversion Tracking tab.
  - **Click ID Value**: The unique tracking ID. If not set, it will be automatically read from the `_exoclick_cid` first-party cookie.
  - **Conversion Value**: Required in case you are using **dynamic values** on this Conversion Goal.
  - **Enable cookie syncing**: Enables third-party cookie-syncing pixels from the browser (e.g., to `s.chmsrv.com`, `s.pemsrv.com`, etc.) if the server-side conversion request fails due to no available Click ID to be used or due to an invalid Click ID.

### 2. General Settings

- **Use Optimistic Scenario**: Check to fire the tag success trigger regardless of the actual API result.
- **Ad Storage Consent**: Choose "Send data in case marketing consent given" to abort execution if `ad_storage` is not granted.

### 3. Logging

- **Logs Settings**: Options to log to console "Always", "Never", or during "Debug and preview".
- **BigQuery Logs**: Enable to log full event data to a BigQuery table.
  - **Project ID**: Defaults to `GOOGLE_CLOUD_PROJECT` environment variable if empty.
  - **Dataset ID**: Required.
  - **Table ID**: Required.

## Open Source

The **ExoClick Tag for GTM Server Side** is developed and maintained by the [Stape Team](https://stape.io/) under the Apache 2.0 license.
