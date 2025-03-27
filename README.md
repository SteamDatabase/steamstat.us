steamstat.us
============

Frontend for the [Steam Status](https://steamstat.us/) website.
Backend is in a separate repository and is not open source.

License: [MIT](LICENSE).

#### Counter-Strike Status

The CS regions and service status come from Valve's
[GetGameServersStatus](https://steamapi.xpaw.me/#ICSGOServers_730/GetGameServersStatus) API.
Unfortunately this API is not available for other games.

Backend automatically creates status keys for new regions, such as `cs_china_beijing`,
but they need to be manually added to [index.html](src/index.html) to be actually displayed.

#### Flags

Country and U.S. state flags are from https://github.com/HatScripts/circle-flags which are MIT licensed.
The SVG icons are edited to remove the circle mask, because the cirle is done with CSS instead.

#### API

The data endpoint referenced in this code is exclusively for use by the steamstat.us website itself.
It is not a public API and is not intended for use by third parties.
Please do not attempt to use this endpoint in your own applications.

If you need to monitor Steam services for your own projects, you should implement your own monitoring
solution by directly accessing Steam services, rather than relying on third-party services like steamstat.us.
