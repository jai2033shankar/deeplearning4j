
var selectedVertex = 0;
function setSelectedVertex(vertex){
    selectedVertex = vertex;
}

var selectedMeanMagChart = "ratios";
function setSelectMeanMagChart(selectedChart){
    selectedMeanMagChart = selectedChart;
}

function renderModelPage() {

    $.ajax({
        url: "/train/model/data/" + selectedVertex,
        async: true,
        error: function (query, status, error) {
            console.log("Error getting data: " + error);
        },
        success: function (data) {
            renderLayerTable(data);
            renderMeanMagChart(data);
            renderActivationsChart(data);
            renderLearningRateChart(data);
            renderParametersHistogram(data);
            renderUpdatesHistogram(data);
        }
    });
}

/* ---------- Zero State ---------- */

function renderZeroState() { // Need to ask Alex how to deal with error when selectedVertex == 0.

    if (selectedVertex == 0) {
        $("#layerDetails").hide();
        $("#zeroState").show();
    }
    else {
        $("#layerDetails").show();
        $("#zeroState").hide();
    }

}

/* ---------- Layer Table Data ---------- */
function renderLayerTable(data) {
    var layerInfo = data["layerInfo"];
    var nRows = Object.keys(layerInfo);

    //Generate row for each item in the table
    var tbl = $("#layerInfo");
    tbl.empty();
    for (var i = 0; i < nRows.length; i++)  {
        tbl.append("<tr><td>" + layerInfo[i][0] + "</td><td>" + layerInfo[i][1] + "</td></tr>");
    }
}

/* ---------- Mean Magnitudes Chart ---------- */
function renderMeanMagChart(data) {
    var iter = data["meanMag"]["iterCounts"];

    var chart = $("#meanmag");
    if (chart.length) {

        if(!selectedMeanMagChart){
            selectedMeanMagChart = "ratios";
        }

        var isRatio = selectedMeanMagChart == "ratios";

        var ratios = data["meanMag"][selectedMeanMagChart];
        var keys = Object.keys(ratios);
        var toPlot = [];
        var overallMax = -Number.MAX_VALUE;
        var overallMin = Number.MAX_VALUE;
        for (var i = 0; i < keys.length; i++) {
            var r = ratios[keys[i]];

            var pairs = [];
            for (var j = 0; j < r.length; j++) {
                if(isRatio){
                    pairs.push([iter[j], Math.log10(r[j])]);
                } else {
                    pairs.push([iter[j], r[j]]);
                }
            }
            toPlot.push({data: pairs, label: keys[i]});


            var thisMax = Math.max.apply(Math, r);
            var thisMin = Math.min.apply(Math, r);
            overallMax = Math.max(overallMax, thisMax);
            overallMin = Math.min(overallMin, thisMin);
        }

        if (overallMax == -Number.MAX_VALUE) overallMax = 1.0;
        if (overallMin == Number.MAX_VALUE) overallMin = 0.0;

        if(isRatio){
            overallMax = Math.log10(overallMax);
            overallMin = Math.log10(overallMin);
            overallMin = Math.max(overallMin, -10);

            overallMax = Math.ceil(overallMax);
            overallMin = Math.floor(overallMin);
        }

        //Trying to hide the "log10" part...
        // if(isRatio){
        //     $("#updateRatioTitleLog10").show();
        // } else {
        //     $("#updateRatioTitleLog10").hide();
        // }

        if(isRatio){
            $("#updateRatioTitleSmallLog10").show();
        } else {
            $("#updateRatioTitleSmallLog10").hide();
        }

        var plot = $.plot(chart,
            toPlot, {
                series: {
                    lines: {
                        show: true,
                        lineWidth: 2,
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true,
                    tickColor: "#dddddd",
                    borderWidth: 0
                },
                yaxis: {min: overallMin, max: overallMax},
                colors: ["#FA5833", "#2FABE9"]
            });

        function showTooltip(x, y, contents) {
            $('<div id="tooltipMMChart">' + contents + '</div>').css({
                position: 'absolute',
                display: 'none',
                top: y + 8,
                left: x + 10,
                border: '1px solid #fdd',
                padding: '2px',
                'background-color': '#dfeffc',
                opacity: 0.80
            }).appendTo("#meanmag").fadeIn(200);
        }

        var previousPoint = null;
        $("#meanmag").bind("plothover", function (event, pos, item) {
            $("#xMeanMagnitudes").text(pos.x.toFixed(0));
            $("#yMeanMagnitudes").text(pos.y.toFixed(2));

            //Tooltip
            if (item) {
                if (previousPoint != item.dataIndex) {
                    previousPoint = item.dataIndex;

                    $("#tooltipMMChart").remove();
                    var x = item.datapoint[0].toFixed(0);
                    var logy = item.datapoint[1].toFixed(5);
                    var y = Math.pow(10, item.datapoint[1]).toFixed(5);

                    if(selectedMeanMagChart == "ratios"){
                        showTooltip(item.pageX - chart.offset().left, item.pageY - chart.offset().top,
                            item.series.label + " (" + x + ", logRatio=" + logy + ", ratio=" + y + ")");
                    } else {
                        showTooltip(item.pageX - chart.offset().left, item.pageY - chart.offset().top,
                            item.series.label + " (" + x + ", " + y + ")");
                    }
                }
            }
            else {
                $("#tooltipMMChart").remove();
                previousPoint = null;
            }
        });
    }
}

/* ---------- Activations Chart ---------- */
function renderActivationsChart(data) {

    var mean = data["activations"]["mean"];
    var stdev = data["activations"]["stdev"];
    var iter = data["activations"]["iterCount"];

    var chart = $("#activations");
    if (chart.length) {
        var meanData = [];
        var meanPlus2 = [];
        var meanMinus2 = [];

        var overallMin = Number.MAX_VALUE;
        var overallMax = -Number.MAX_VALUE;

        for (var i = 0; i < iter.length; i++) {
            var mp2 = mean[i] + 2*stdev[i];
            var ms2 = mean[i] - 2*stdev[i];
            overallMin = Math.min(overallMin, ms2);
            overallMax = Math.max(overallMax, mp2);
            meanData.push([iter[i], mean[i]]);
            meanPlus2.push([iter[i], mp2]);
            meanMinus2.push([iter[i], ms2]);
        }

        if(overallMin == Number.MAX_VALUE) overallMin = 0;
        if(overallMax == Number.MIN_VALUE) overallMax = 1;

        var plot = $.plot(chart,
            [{data: meanData, label: "Mean"},{data: meanPlus2, label: "Mean + 2*sd"}, {data: meanMinus2, label: "Mean - 2*sd"}], {


                series: {
                    lines: {
                        show: true,
                        lineWidth: 2,
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true,
                    tickColor: "#dddddd",
                    borderWidth: 0
                },
                yaxis: {min: overallMin, max: overallMax},
                colors: ["#FA5833", "#2FABE9", "#2FABE9"]
            });


        function showTooltip(x, y, contents) {
            $('<div id="tooltipActivationChart">' + contents + '</div>').css({
                position: 'absolute',
                display: 'none',
                top: y + 8,
                left: x + 10,
                border: '1px solid #fdd',
                padding: '2px',
                'background-color': '#dfeffc',
                opacity: 0.80
            }).appendTo("#activations").fadeIn(200);
        }

        var previousPoint = null;
        $("#activations").bind("plothover", function (event, pos, item) {
            $("#xActivations").text(pos.x.toFixed(0));
            $("#yActivations").text(pos.y.toFixed(2));


            //Tooltip
            if (item) {
                if (previousPoint != item.dataIndex) {
                    previousPoint = item.dataIndex;

                    $("#tooltipActivationChart").remove();
                    var x = item.datapoint[0].toFixed(0);
                    var y = item.datapoint[1].toFixed(5);

                    //TODO get raw stdev...
                    // var std = (meanPlus2[x] - meanData[x])/2.0;  //This doesn't work

                    showTooltip(item.pageX - chart.offset().left, item.pageY - chart.offset().top,
                        // item.series.label + " (" + x + ", stdev=" + std + ")");
                        item.series.label + " (" + x + ", y=" + y + ")");
                }
            }
            else {
                $("#tooltipActivationChart").remove();
                previousPoint = null;
            }
        });
    }
}

/* ---------- Learning Rate Chart ---------- */
function renderLearningRateChart(data) {
    var iter = data["learningRates"]["iterCounts"];

    var chart = $("#learningrate");
    if (chart.length) {

        // var lrs_bData = [];
        // var lrs_WData = [];
        var lrs = data["learningRates"]["lrs"];
        var keys = Object.keys(lrs);

        var toPlot = [];
        var overallMax = -Number.MAX_VALUE;
        var overallMin = Number.MAX_VALUE;
        for (var i = 0; i < keys.length; i++) {
            var lr = lrs[keys[i]];

            var pairs = [];
            for (var j = 0; j < lr.length; j++) {
                pairs.push([iter[j], lr[j]]);
            }
            toPlot.push({data: pairs, label: keys[i]});


            var thisMax = Math.max.apply(Math, lr);
            var thisMin = Math.min.apply(Math, lr);
            overallMax = Math.max(overallMax, thisMax);
            overallMin = Math.min(overallMin, thisMin);
        }

        if (overallMax == -Number.MAX_VALUE){
            //No data
            overallMin = 0.0;
            overallMax = 1.0;
        } else if(overallMin == overallMax){
            overallMax = 2*overallMax;
        }

        overallMin = 0;

        var plot = $.plot(chart,
            toPlot, {
                series: {
                    lines: {
                        show: true,
                        lineWidth: 2,
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true,
                    tickColor: "#dddddd",
                    borderWidth: 0
                },
                yaxis: {min: overallMin, max: overallMax},
                colors: ["#FA5833", "#2FABE9"]
            });

        function showTooltip(x, y, contents) {
            $('<div id="tooltipLRChart">' + contents + '</div>').css({
                position: 'absolute',
                display: 'none',
                top: y + 8,
                left: x + 10,
                border: '1px solid #fdd',
                padding: '2px',
                'background-color': '#dfeffc',
                opacity: 0.80
            }).appendTo("#learningrate").fadeIn(200);
        }

        var previousPoint = null;
        chart.bind("plothover", function (event, pos, item) {
            $("#xLearningRate").text(pos.x.toFixed(0));
            $("#yLearningRate").text(pos.y.toFixed(5));


            //Tooltip
            if (item) {
                if (previousPoint != item.dataIndex) {
                    previousPoint = item.dataIndex;

                    $("#tooltipLRChart").remove();
                    var x = item.datapoint[0].toFixed(0);
                    var y = item.datapoint[1].toFixed(5);

                    showTooltip(item.pageX - chart.offset().left, item.pageY - chart.offset().top,
                        item.series.label + " (" + x + ", learningRate=" + y + ")");
                }
            }
            else {
                $("#tooltipLRChart").remove();
                previousPoint = null;
            }
        });
    }
}

/* ---------- Parameters Histogram ---------- */

function selectParamHist(paramName){
    currSelectedParamHist = paramName;
}

var currSelectedParamHist = null;
function renderParametersHistogram(data) {

    var histograms = data["paramHist"];
    var paramNames = histograms["paramNames"];

    //Create buttons, add them to the div...
    var buttonDiv = $("#paramHistButtonsDiv");
    buttonDiv.empty();
    for( var i=0; i<paramNames.length; i++ ){
        var n = "paramBtn_"+paramNames[i];
        var btn = $('<input id="' + n + '" class="btn btn-small"/>').attr({type:"button",name:n,value:paramNames[i]});

        var onClickFn = (function(pName){
            return function(){
                selectParamHist(pName);
            }
        })(paramNames[i]);

        $(document).on("click", "#" + n, onClickFn);
        buttonDiv.prepend(btn);
    }

    if(currSelectedParamHist == null){
        if(jQuery.inArray("W",paramNames)) currSelectedParamHist = "W";
        else if(paramNames.length > 0) currSelectedParamHist = paramNames[0];
    }


    if(currSelectedParamHist != null && $("#parametershistogram").length){

        var label = $("#paramhistSelected");
        label.html("&nbsp&nbsp(" + currSelectedParamHist + ")");

        var min = data["paramHist"][currSelectedParamHist]["min"];
        var max = data["paramHist"][currSelectedParamHist]["max"];

        var bins = data["paramHist"][currSelectedParamHist]["bins"];
        var counts = data["paramHist"][currSelectedParamHist]["counts"];

        var binWidth = (max-min)/bins;
        var halfBin = binWidth/2.0;

        var data = [];
        for (var i = 0; i < counts.length; i++) {
            var binPos = (min + i * binWidth - halfBin);
            data.push([binPos, counts[i]]);
        }

        $.plot($("#parametershistogram"), [ data ], {
            stack: null,
            series: {
                bars: { show: true, barWidth: binWidth }
            },
            colors: ["#2FABE9"]
        });
    }
}

/* ---------- Updates Histogram ---------- */
function selectUpdateHist(paramName){
    currSelectedUpdateHist = paramName;
}

var currSelectedUpdateHist = null;
function renderUpdatesHistogram(data) {

    var histograms = data["updateHist"];
    var paramNames = histograms["paramNames"];

    //Create buttons, add them to the div...
    var buttonDiv = $("#updateHistButtonsDiv");
    buttonDiv.empty();
    for( var i=0; i<paramNames.length; i++ ){
        var n = "updParamBtn_"+paramNames[i];
        var btn = $('<input id="' + n + '" class="btn btn-small"/>').attr({type:"button",name:n,value:paramNames[i]});

        var onClickFn = (function(pName){
            return function(){
                selectUpdateHist(pName);
            }
        })(paramNames[i]);

        $(document).on("click", "#" + n, onClickFn);
        buttonDiv.prepend(btn);
    }

    if(currSelectedUpdateHist == null){
        if(jQuery.inArray("W",paramNames)) currSelectedUpdateHist = "W";
        else if(paramNames.length > 0) currSelectedUpdateHist = paramNames[0];
    }


    var chart = $("#updateshistogram");
    if(currSelectedUpdateHist != null && chart.length){

        var label = $("#updatehistSelected");
        label.html("&nbsp&nbsp(" + currSelectedUpdateHist + ")");

        var min = data["updateHist"][currSelectedUpdateHist]["min"];
        var max = data["updateHist"][currSelectedUpdateHist]["max"];

        var bins = data["updateHist"][currSelectedUpdateHist]["bins"];
        var counts = data["updateHist"][currSelectedUpdateHist]["counts"];

        var binWidth = (max-min)/bins;
        var halfBin = binWidth/2.0;

        var data = [];
        for (var i = 0; i < counts.length; i++) {
            var binPos = (min + i * binWidth - halfBin);
            data.push([binPos, counts[i]]);
        }

        $.plot(chart, [ data ], {
            stack: null,
            series: {
                bars: { show: true, barWidth: binWidth }
            },
            colors: ["#2FABE9"]
        });
    }
}