// let option ={
//     playerContent: {
//         defaultResult: {
//             class: [{
//                 type_id: 6,
//                 type_name: "短剧"
//             }]
//         }
//     }
// }
var MacCmsGMSpider = function (options) {
    const categoryFilterCachePrefix = "category_";

    function getVodList() {
        let vodList = [];
        $("a.module-item").each(function () {
            vodList.push({
                vod_id: $(this).attr("href"),
                vod_name: $(this).find(".module-poster-item-title").text().trim(),
                vod_pic: formatImgUrl($(this).find(".module-item-pic img").data("original")),
                vod_remarks: $(this).find(".module-item-douban").text().trim(),
                vod_year: $(this).find(".module-item-note").text().trim()
            })
        });
        return vodList;
    }

    function getSearchVodList() {
        let vodList = [];
        $(".module-card-item").each(function () {
            vodList.push({
                vod_id: $(this).find(".module-card-item-poster").attr("href"),
                vod_name: $(this).find(".module-card-item-title").text().trim(),
                vod_pic: formatImgUrl($(this).find(".module-item-pic img").data("original")),
                vod_remarks: $(this).find(".module-item-douban").text().trim(),
                vod_year: $(this).find(".module-item-note").text().trim()
            })
        });
        return vodList;
    }

    function formatImgUrl(url) {
        if (!url.startsWith("http")) {
            url = window.location.origin + url;
        }
        if (options?.configPicUserAgent) {
            url = url + "@User-Agent=" + window.navigator.userAgent;
        }
        return url;
    }

    return {
        homeContent: function (filter) {
            const option = options.playerContent;
            let result = Object.assign({
                class: [],
                filters: {},
                list: []
            }, option?.defaultResult || {});
            $(option.category.select).slice(...option.category.slice).each(function () {
                let categoryHref = $(this).find(".links").attr("href");
                if (categoryHref.startsWith("http")) {
                    if (categoryHref.startsWith(window.location.origin)) {
                        categoryHref = categoryHref.substring(window.location.origin.length);
                    } else {
                        return true;
                    }
                }
                const categoryId = categoryHref.split(/[/.]/).at(2);
                result.class.push({
                    type_id: categoryId,
                    type_name: $(this).find(".links").attr("title")
                });
            })
            result.class.forEach(function (item) {
                const cacheFilter = localStorage.getItem(categoryFilterCachePrefix + item.type_id);
                if (typeof cacheFilter !== "undefined" && cacheFilter !== null) {
                    result.filters[item.type_id] = JSON.parse(cacheFilter);
                }
            })
            result.list = getVodList();
            return result;
        },
        categoryContent: function (tid, pg, filter, extend) {
            let result = {
                list: [],
                pagecount: $("#page").find(".page-link:last").attr("href")?.split(/[/.]/).at(2).split("-").at(8) || 1
            };
            const filters = [];
            $(".module-class-item ").each(function () {
                const filter = {
                    key: "",
                    name: $(this).find(".module-item-title").text().trim(),
                    value: []
                }
                $(this).find(".module-item-box a").each(function () {
                    const params = $(this).attr("href").split(/[/.]/).at(2).split("-").slice(1);
                    filter.key = "index" + params.findIndex((element) => element.length > 0)
                    filter.value.push({
                        n: $(this).text().trim(),
                        v: params.find((element) => element.length > 0) || ""
                    })
                })
                filters.push(filter);
            })
            localStorage.setItem(categoryFilterCachePrefix + tid, JSON.stringify(filters));
            result.list = getVodList();
            return result;
        },
        detailContent: function (ids) {
            let items = {};
            $(".module-info-item").each(function () {
                items[$(this).find(".module-info-item-title").text().trim().replace("：", "")] = $(this).find(".module-info-item-content").text().trim();
            });
            let vodPlayData = [];
            $("#y-playList .module-tab-item").each(function (i) {
                let media = [];
                $(`.module-play-list:eq(${i}) .module-play-list-link`).each(function () {
                    media.push({
                        name: $(this).text().trim(),
                        type: "webview",
                        ext: {
                            replace: {
                                playUrl: $(this).attr("href"),
                            }
                        }
                    });
                })
                vodPlayData.push({
                    from: $(this).data("dropdown-value"),
                    media: media
                })
            })

            return vod = {
                vod_id: ids[0],
                vod_name: $(".module-info-heading h1").text().trim(),
                vod_pic: formatImgUrl($(".module-info-poster .module-item-pic img").data("original")),
                vod_remarks: items?.["更新"] || "",
                vod_director: items?.["导演"] || "",
                vod_actor: items?.["主演"] || "",
                vod_content: $(".module-info-introduction-content").text().trim(),
                vod_play_data: vodPlayData
            };
        },
        playerContent: function (flag, id, vipFlags) {
            return {
                type: "match"
            };
        },
        searchContent: function (key, quick, pg) {
            const result = {
                list: [],
                pagecount: $("#page").find(".page-link:last").attr("href")?.split(/[/.]/).at(2).split("-").at(10) || 1
            };
            result.list = getSearchVodList();
            return result;
        }
    };
}