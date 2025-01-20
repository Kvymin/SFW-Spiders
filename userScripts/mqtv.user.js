// ==UserScript==
// @name         mqtv
// @namespace    gmspider
// @version      2024.11.12
// @description  麻雀视频 GMSpider
// @author       Luomo
// @match        https://www.mqtv.cc/*
// @require      https://cdn.jsdelivr.net/gh/CatVodSpider-GM/Spiders-Lib@main/lib/browser-extension-url-match-1.2.0.min.js
// @require      https://cdn.jsdelivr.net/npm/ajax-hook@3.0.3/dist/ajaxhook.umd.min.js
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==
console.log(JSON.stringify(GM_info));
(function () {
    const GMSpiderArgs = {};
    if (typeof GmSpiderInject !== 'undefined') {
        let args = JSON.parse(GmSpiderInject.GetSpiderArgs());
        GMSpiderArgs.fName = args.shift();
        GMSpiderArgs.fArgs = args;
    } else {
        GMSpiderArgs.fName = "categoryContent";
        GMSpiderArgs.fArgs = ["小巷人家", false, 1];
    }
    Object.freeze(GMSpiderArgs);
    let hookConfigs = {
        "homeContent": [{
            dataKey: "VodList",
            matcher: matchPattern("https://*/libs/VodList.api.php?*").assertValid()
        }],
        "categoryContent": [{
            dataKey: "VodList",
            matcher: matchPattern("https://*/libs/VodList.api.php?*").assertValid(),
            onRequestHook: function (config, handler) {
                let url = new URL(config.url);
                url.searchParams.set('page', GMSpiderArgs.fArgs[1]);
                config.url = url.toString();
            }
        }],
        "detailContent": [{
            dataKey: "VodInfo",
            matcher: matchPattern("https://*/libs/VodInfo.api.php?*").assertValid()
        }],
        "playerContent": [{
            dataKey: "VodInfo",
            matcher: matchPattern("https://*/libs/VodInfo.api.php?*").assertValid(),
            onResponseHook: function (response, handler) {
                let anchor = window.location.hash.split("#").at(1);
                let vodInfo = JSON.parse(response.response)?.data;
                vodInfo.playinfo.forEach((playinfo) => {
                    playinfo.player.forEach((player, index) => {
                        if (player.url === anchor) {
                            localStorage.setItem("history", JSON.stringify({
                                exp: new Date().getTime(),
                                val: [{
                                    "id": vodInfo.id,
                                    "type": vodInfo.type,
                                    "title": vodInfo.title,
                                    "img": vodInfo.img,
                                    "url": player.url,
                                    "episode": player.no,
                                    "ensite": playinfo.ensite,
                                    "cnsite": playinfo.cnsite,
                                    "num": index
                                }]
                            }));
                        }
                    })
                });
            }
        }],
        "searchContent": [{
            dataKey: "titlegetdata",
            matcher: matchPattern("https://*.yfsp.tv/api/list/gettitlegetdata?*").assertValid()
        }, {
            matcher: matchPattern("https://*.yfsp.tv/api/home/gethotsearch?*").assertValid(),
            onResponseHook: function (response, handler) {
                document.querySelector(".search-log span").dispatchEvent(new Event("click"));
            }
        }],
    };
    const GmSpider = (function () {
        const categoryFilterCachePrefix = "category.";

        function formatVodList(vodList) {
            let vods = [];
            vodList.forEach(function (vod) {
                vods.push({
                    vod_id: vod.url,
                    vod_name: vod.title,
                    vod_pic: vod.img,
                    vod_remarks: vod.remark
                })
            })
            return vods;
        }

        return {
            homeContent: function (filter) {
                let result = {
                    class: [
                        {type_id: "movie", type_name: "电影"},
                        {type_id: "tv", type_name: "电视剧"},
                        {type_id: "va", type_name: "综艺"},
                        {type_id: "ct", type_name: "动漫"}
                    ],
                    filters: {},
                    list: []
                };
                result.list.push(...formatVodList(hookResult.VodList?.data?.ct?.[0]?.show), ...formatVodList(hookResult.VodList?.data?.movie?.[0]?.show), ...formatVodList(hookResult.VodList?.data?.tv?.[0]?.show));
                return result;
            },
            categoryContent: function (tid, pg, filter, extend) {
                let result = {
                    list: [],
                    pagecount: pg
                };
                result.list = formatVodList(hookResult.VodList?.data)
                if (result.list.length >= 25) {
                    result.pagecount = pg + 1;
                }
                return result;
            },
            detailContent: function (ids) {
                const vodInfo = hookResult.VodInfo.data;
                let vodPlayData = [];
                hookResult.VodInfo.data.playinfo.forEach((item) => {
                    let media = [];
                    item.player.forEach((player) => {
                        media.push({
                            name: player.no,
                            type: "webview",
                            ext: {
                                replace: {
                                    url: vodInfo.id,
                                    anchor: player.url
                                }
                            }
                        });
                    })
                    vodPlayData.push({
                        from: item.cnsite,
                        media: media
                    })
                });
                return {
                    vod_id: vodInfo.id,
                    vod_name: vodInfo.title,
                    vod_pic: vodInfo.img,
                    vod_actor: vodInfo.actor,
                    vod_director: vodInfo.director,
                    vod_area: vodInfo.area,
                    vod_year: vodInfo.year,
                    vod_remarks: vodInfo.remark,
                    vod_play_data: vodPlayData
                };
            },
            playerContent: function (flag, id, vipFlags) {
                return {
                    type: "match"
                };
            },
            searchContent: function (key, quick, pg) {
                let result = {
                    list: [],
                    pagecount: 1
                };
                if (pg == 1) {
                    hookResult.titlegetdata.data.list.forEach((media) => {
                        result.list.push({
                            vod_id: media.mediaKey,
                            vod_name: media.title,
                            vod_pic: media.coverImgUrl,
                            vod_remarks: media.updateStatus,
                            vod_year: media.regional
                        })
                    })
                }
                return result;
            }
        };
    })();
    let spiderExecuted = false;
    let dataReadyCount = 0;
    let hookResult = {};
    const {unProxy, originXhr} = proxy({
        onRequest: (config, handler) => {
            hookConfigs[GMSpiderArgs.fName].forEach((hookConfig) => {
                if (typeof hookConfig.onRequestHook === "function" && hookConfig.matcher.match(config.url)) {
                    hookConfig.onRequestHook(config, handler);
                }
            });
            handler.next(config);
        },
        onResponse: (response, handler) => {
            if (!spiderExecuted) {
                let dataTodoCount = 0;
                let requestUrl = response.config.url;
                if (!requestUrl.startsWith("http")) {
                    requestUrl = window.location.origin + requestUrl;
                }
                hookConfigs[GMSpiderArgs.fName].forEach((hookConfig) => {
                    if (typeof hookConfig.dataKey !== "undefined") {
                        if (hookConfig?.require !== false) {
                            dataTodoCount++;
                        }
                        if (hookConfig.matcher.match(requestUrl)) {
                            if (hookConfig?.require !== false) {
                                dataReadyCount++;
                            }
                            try {
                                let data = JSON.parse(response.response);
                                if (typeof data === 'object' && data) {
                                    hookResult[hookConfig.dataKey] = data;
                                } else {
                                    hookResult[hookConfig.dataKey] = response.response;
                                }
                            } catch (e) {
                            }
                        }
                    }
                    if (typeof hookConfig.onResponseHook === "function" && hookConfig.matcher.match(requestUrl)) {
                        hookConfig.onResponseHook(response, handler);
                    }
                });
                if (dataTodoCount === dataReadyCount) {
                    spiderExecuted = true;
                    const result = GmSpider[GMSpiderArgs.fName](...GMSpiderArgs.fArgs);
                    console.log(result);
                    if (typeof GmSpiderInject !== 'undefined' && spiderExecuted) {
                        GmSpiderInject.SetSpiderResult(JSON.stringify(result));
                    }
                }
            }
            handler.next(response);
        }
    }, unsafeWindow)
})();