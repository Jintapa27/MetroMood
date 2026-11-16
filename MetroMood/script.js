$(document).ready(function () {
    var stationChart = echarts.init(document.getElementById("mainChart"));
    var hourlyChart = echarts.init(document.getElementById("rightUpChart"));
    var heatmapChart = echarts.init(document.getElementById("rightDownChart"));

    var fontFamily = "Nunito, 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
    var loadingStyle = {
        text: "Getting the chart ready...",
        color: "#5470C6",
        textColor: "#5A6580",
        maskColor: "rgba(255, 255, 255, 0.85)",
        fontSize: 14
    };

    stationChart.showLoading("default", loadingStyle);
    hourlyChart.showLoading("default", loadingStyle);
    heatmapChart.showLoading("default", loadingStyle);

    var allStations = [];
    var selectedStationName = "";

    var defaultStationTitle = "No station picked yet";
    var defaultStationText = "Choose one above and we'll tell you how busy it is.";

    function logLoadError(fileName) {
        console.error("Could not load " + fileName + ". If you opened the page straight from a folder, try a local server.");
    }

    function formatNumber(value) {
        return Number(value).toLocaleString();
    }

    var compactFormatter = new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1
    });

    function showChartMessage(chart, message) {
        chart.hideLoading();
        chart.setOption({
            title: {
                text: message,
                left: "center",
                top: "middle",
                textStyle: { fontSize: 14, fontWeight: "normal", color: "#5A6580", fontFamily: fontFamily }
            }
        });
    }

    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function describeDate(dateText) {
        var parts = dateText.split("-");
        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);
        var dateObject = new Date(year, month - 1, day);
        var weekday = dayNames[dateObject.getDay()];

        return {
            short: month + "/" + day + " " + weekday,
            long: weekday + ", " + monthNames[month - 1] + " " + day,
            isWeekend: dateObject.getDay() === 0 || dateObject.getDay() === 6
        };
    }

    //Station data
    $.get("./processed/station_activity.csv", function (csvData) {
        var rows = csvData.trim().split(/\r?\n/);

        for (var i = 1; i < rows.length; i++) {
            var columns = rows[i].split(",");
            var name = columns[0] ? columns[0].trim() : "";

            if (columns.length >= 2 && name !== "") {
                allStations.push({ name: name, activity: Number(columns[1]) || 0 });
            }
        }

        if (allStations.length === 0) {
            stationChart.hideLoading();
            $("#busiestStation").text("No data yet");
            $("#selectedActivity").text("The station data file looks empty. Try refreshing the page.");
            return;
        }

        allStations.sort(function (a, b) {
            return b.activity - a.activity;
        });

        var totalStations = allStations.length;
        var busiest = allStations[0];

        $("#busiestStation").text(busiest.name);
        $("#stationNote").text(compactFormatter.format(busiest.activity) + " entries and exits in September");

        var stationSelect = $("#stationSelect");
        stationSelect.empty();
        stationSelect.append($("<option>").val("").text("Choose a station..."));

        for (var i = 0; i < allStations.length; i++) {
            stationSelect.append(
                $("<option>").val(allStations[i].name).text(allStations[i].name)
            );
        }

        var topStations = allStations.slice(0, 10);

        function updateStationChart() {
            var topNames = [];
            var barData = [];

            for (var i = 0; i < topStations.length; i++) {
                topNames.push(topStations[i].name);
                barData.push({
                    value: topStations[i].activity,
                    itemStyle: {
                        color: topStations[i].name === selectedStationName ? "#E76F51" : "#5470C6",
                        borderRadius: [0, 6, 6, 0]
                    }
                });
            }

            stationChart.hideLoading();
            stationChart.setOption({
                textStyle: { fontFamily: fontFamily },
                tooltip: {
                    trigger: "axis",
                    axisPointer: { type: "shadow" },
                    formatter: function (params) {
                        return params[0].name + "<br>" + formatNumber(params[0].value) + " entries and exits";
                    }
                },
                grid: { left: 12, right: 28, top: 24, bottom: 28, containLabel: true },
                xAxis: {
                    type: "value",
                    name: "Entries + exits",
                    nameLocation: "middle",
                    nameGap: 30,
                    nameTextStyle: { color: "#5A6580" },
                    axisLabel: { color: "#5A6580", formatter: function (value) { return compactFormatter.format(value); } },
                    splitLine: { lineStyle: { color: "#F0E9E0" } }
                },
                yAxis: {
                    type: "category",
                    data: topNames,
                    inverse: true,
                    axisLabel: { color: "#3F4C6B", fontSize: 13 },
                    axisLine: { show: false },
                    axisTick: { show: false }
                },
                series: [{
                    name: "Passenger activity",
                    type: "bar",
                    data: barData,
                    barMaxWidth: 26
                }]
            });
        }

        stationSelect.on("change", function () {
            selectedStationName = $(this).val();

            if (selectedStationName === "") {
                $("#selectedStation").text(defaultStationTitle);
                $("#selectedActivity").text(defaultStationText);
            } else {
                var rank = 0;
                var activity = 0;
                for (var i = 0; i < allStations.length; i++) {
                    if (allStations[i].name === selectedStationName) {
                        rank = i + 1;
                        activity = allStations[i].activity;
                    }
                }

                var message = formatNumber(activity) + " entries and exits in September, " +
                    "which makes it #" + rank + " of " + totalStations + " stations. ";

                if (rank <= 10) {
                    message += "It made the top 10, so it's lit up in orange below.";
                } else if (rank > totalStations - 10) {
                    message += "One of the quieter stops, so you won't find it in the top 10 below.";
                } else {
                    message += "It's outside the top 10, so you won't see it highlighted below.";
                }

                $("#selectedStation").text(selectedStationName);
                $("#selectedActivity").text(message);
            }
            updateStationChart();
        });

        updateStationChart();
    }).fail(function () {
        logLoadError("processed/station_activity.csv");
        $("#busiestStation").text("Not available");
        $("#stationNote").text("We couldn't load the station data. Try refreshing?");
        $("#selectedActivity").text("We couldn't load the station data just now. Try refreshing the page.");
        showChartMessage(stationChart, "We couldn't load this chart. Try refreshing the page.");
    });

    //Hourly data
    $.get("./processed/hourly_activity.csv", function (csvData) {
        var rows = csvData.trim().split(/\r?\n/);
        var totalsByHour = {};

        for (var i = 1; i < rows.length; i++) {
            var columns = rows[i].split(",");
            if (columns.length >= 2 && columns[0] !== "") {
                totalsByHour[columns[0].trim().padStart(2, "0")] = Number(columns[1]) || 0;
            }
        }

        var hourList = [];
        var passengerList = [];
        var totalTrips = 0;
        var busiestIndex = 0;

        for (var h = 0; h < 24; h++) {
            var label = String(h).padStart(2, "0");
            hourList.push(label);
            passengerList.push(totalsByHour[label] || 0);
        }

        for (var i = 0; i < passengerList.length; i++) {
            totalTrips += passengerList[i];
            if (passengerList[i] > passengerList[busiestIndex]) {
                busiestIndex = i;
            }
        }

        var nextHour = String((busiestIndex + 1) % 24).padStart(2, "0");
        var sharePercent = totalTrips > 0 ? Math.round((passengerList[busiestIndex] / totalTrips) * 100) : 0;

        $("#totalTrips").text(formatNumber(totalTrips));
        $("#busiestHour").text(hourList[busiestIndex] + ":00 – " + nextHour + ":00");
        $("#hourNote").text("About " + sharePercent + "% of the month's trips happen in this one hour");

        hourlyChart.hideLoading();
        hourlyChart.setOption({
            textStyle: { fontFamily: fontFamily },
            tooltip: {
                trigger: "axis",
                formatter: function (params) {
                    return params[0].axisValue + ":00<br>" + formatNumber(params[0].value) + " trips";
                }
            },
            grid: { left: 12, right: 24, top: 44, bottom: 34, containLabel: true },
            xAxis: {
                type: "category",
                data: hourList,
                name: "Hour of day",
                nameLocation: "middle",
                nameGap: 28,
                nameTextStyle: { color: "#5A6580" },
                axisLabel: { color: "#5A6580", interval: 2 }
            },
            yAxis: {
                type: "value",
                name: "Trips",
                nameTextStyle: { color: "#5A6580" },
                axisLabel: { color: "#5A6580", formatter: function (value) { return compactFormatter.format(value); } },
                splitLine: { lineStyle: { color: "#F0E9E0" } }
            },
            series: [{
                name: "Passenger trips",
                type: "line",
                data: passengerList,
                smooth: true,
                symbolSize: 5,
                lineStyle: { color: "#E76F51", width: 3 },
                itemStyle: { color: "#E76F51" },
                areaStyle: { color: "#E76F51", opacity: 0.12 },
                markPoint: {
                    data: [{ type: "max", name: "Peak" }],
                    symbolSize: 46,
                    itemStyle: { color: "#E76F51" },
                    label: { formatter: "Peak", color: "#FFFFFF", fontSize: 11, fontWeight: "bold" }
                }
            }]
        });
    }).fail(function () {
        logLoadError("processed/hourly_activity.csv");
        $("#totalTrips, #busiestHour").text("Not available");
        $("#tripsNote, #hourNote").text("We couldn't load the hourly data. Try refreshing?");
        showChartMessage(hourlyChart, "We couldn't load this chart. Try refreshing the page.");
    });

    //Heatmap data
    $.get("./processed/date_hour_heatmap.csv", function (csvData) {
        var rows = csvData.trim().split(/\r?\n/);
        var dateList = [];
        var hourList = [];
        var rawRows = [];

        for (var h = 0; h < 24; h++) {
            hourList.push(String(h).padStart(2, "0"));
        }

        for (var i = 1; i < rows.length; i++) {
            var columns = rows[i].split(",");
            if (columns.length >= 3) {
                var date = columns[0].trim();
                var hour = columns[1].trim().padStart(2, "0");
                var trips = Number(columns[2]) || 0;
                if (date && !dateList.includes(date)) dateList.push(date);
                rawRows.push({ date: date, hour: hour, trips: trips });
            }
        }

        dateList.sort();

        var dateInfo = {};
        for (var i = 0; i < dateList.length; i++) {
            dateInfo[dateList[i]] = describeDate(dateList[i]);
        }

        var heatmapData = rawRows.map(function (row) {
            return [hourList.indexOf(row.hour), dateList.indexOf(row.date), row.trips];
        });

        var maxTrips = 0;
        for (var i = 0; i < heatmapData.length; i++) {
            if (heatmapData[i][2] > maxTrips) maxTrips = heatmapData[i][2];
        }

        heatmapChart.hideLoading();
        heatmapChart.setOption({
            textStyle: { fontFamily: fontFamily },
            tooltip: {
                position: "top",
                formatter: function (params) {
                    return dateInfo[dateList[params.value[1]]].long + " · " + hourList[params.value[0]] + ":00" +
                        "<br>" + formatNumber(params.value[2]) + " trips";
                }
            },
            grid: { left: 12, right: 25, top: 14, bottom: 80, containLabel: true },
            xAxis: {
                type: "category",
                data: hourList,
                name: "Hour of day",
                nameLocation: "middle",
                nameGap: 28,
                nameTextStyle: { color: "#5A6580" },
                axisLabel: { fontSize: 10, color: "#5A6580", interval: 2 },
                splitArea: { show: true }
            },
            yAxis: {
                type: "category",
                data: dateList,
                inverse: true,
                axisLabel: {
                    fontSize: 10,
                    color: "#5A6580",
                    interval: 0,
                    formatter: function (value) {
                        var info = dateInfo[value];
                        if (!info) return value;
                        return info.isWeekend ? "{weekend|" + info.short + "}" : info.short;
                    },
                    rich: { weekend: { color: "#E76F51", fontWeight: "bold", fontSize: 10 } }
                },
                splitArea: { show: true }
            },
            visualMap: {
                min: 0,
                max: maxTrips || 1,
                calculable: true,
                orient: "horizontal",
                left: "center",
                bottom: 5,
                text: ["Busier", "Quieter"],
                textStyle: { color: "#5A6580" },
                inRange: { color: ["#E8F4FD", "#73C8D2", "#5470C6", "#44337A"] }
            },
            series: [{
                name: "Passenger trips",
                type: "heatmap",
                data: heatmapData,
                label: { show: false },
                emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(36, 59, 107, 0.25)" } }
            }]
        });
    }).fail(function () {
        logLoadError("processed/date_hour_heatmap.csv");
        showChartMessage(heatmapChart, "We couldn't load this chart. Try refreshing the page.");
    });

    window.addEventListener("resize", function () {
        stationChart.resize();
        hourlyChart.resize();
        heatmapChart.resize();
    });
});
