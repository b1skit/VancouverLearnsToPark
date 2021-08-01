// Initialize the Leaflet map, and center it on Vancouver:
var theMap = L.map('mapid').setView([49.282252, -123.124439], 13);
		
// Add a MapBox streets tile layer to the map:
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
	attribution	: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>',
	tileSize	: 512,
	minZoom		: 14,
	maxZoom		: 18,	// Snapped to MAX_LOAD_ZOOM when VisualizeButton() is called
	zoomControl	: true,
	zoomOffset	: -1,
	id			: 'mapbox/streets-v11',
	accessToken	: 'pk.eyJ1IjoiYjFza2l0IiwiYSI6ImNrMG9ubHd4bjBjcHAzbWp3d2NwdWdoNDYifQ.gopNAShvK6AlH1_qJaWo5w'
}).addTo(theMap);

theMap.zoomControl.setPosition('bottomright'); // Position the zoom controls in the same place as Google maps


// Layer Controls:
//----------------

// Overlay layer names:
const HEATMAP_OVERLAY_NAME 			= "Ticket Heatmap";
const BYLAW_ROADS_OVERLAY_NAME 		= "Color Streets by Highest Bylaw Infractions";
const NUMERIC_MARKERS_OVERLAY_NAME 	= "Ticket Counts";

// Create empty/placeholder overlay entries, that are replaced when we actually load data from the server
var overlayObjects = {};
overlayObjects[HEATMAP_OVERLAY_NAME] 		= L.tileLayer('');	// Empty layer
overlayObjects[BYLAW_ROADS_OVERLAY_NAME] 	= L.tileLayer('');	// Empty layer
overlayObjects[NUMERIC_MARKERS_OVERLAY_NAME]= L.tileLayer('');	// Empty layer



var layerControls = L.control.layers
(
    null, 			// Arg1 = base layers
    overlayObjects,	// Arg2 = overlays
    {				// Arg3 = Options:
        collapsed : false
    }
);
layerControls.addTo(theMap);

// Setup layer events:
theMap.on('overlayadd', OnOverlayAddHandler);
theMap.on('overlayremove', OnOverlayRemoveHandler);



// Legend setup:
//--------------
const BYLAW_RGB_STRINGS =	// Helper: RGB portions of bylaw colors. Used to construct 'rgba(...)' strings
{
    2849	: "152, 78, 163",	// Street and Traffic bylaw
    2952	: "55, 126, 184",	// Parking Meter bylaw
    9344	: "77, 175, 74",	// Motor vehicle noise and emission abatement law
    9978	: "228, 26, 28",	// Granville Mall by-law
    0 		: "255, 255, 255"	// Zero infractions
}; // Credit: Colors based on http://colorbrewer2.org/

const BYLAW_COLORS =
{
    2849	: "rgba(" + BYLAW_RGB_STRINGS[2849] + ", 1)",	// Street and Traffic bylaw
    2952	: "rgba(" + BYLAW_RGB_STRINGS[2952] + ", 1)",	// Parking Meter bylaw
    9344	: "rgba(" + BYLAW_RGB_STRINGS[9344] + ", 1)",	// Motor vehicle noise and emission abatement law
    9978	: "rgba(" + BYLAW_RGB_STRINGS[9978] + ", 1)",	// Granville Mall by-law
    0 		: "rgba(" + BYLAW_RGB_STRINGS[0] + ", 0)",		// Zero infractions
};

const TRANSLUCENT_AMT = 0.6;
const BYLAW_TRANSLUCENT_COLORS = 
{
    2849	: "rgba(" + BYLAW_RGB_STRINGS[2849] + ", " + TRANSLUCENT_AMT + ")",	// Street and Traffic bylaw
    2952	: "rgba(" + BYLAW_RGB_STRINGS[2952] + ", " + TRANSLUCENT_AMT + ")",	// Parking Meter bylaw
    9344	: "rgba(" + BYLAW_RGB_STRINGS[9344] + ", " + TRANSLUCENT_AMT + ")",	// Motor vehicle noise and emission abatement law
    9978	: "rgba(" + BYLAW_RGB_STRINGS[9978] + ", " + TRANSLUCENT_AMT + ")",	// Granville Mall by-law
    0 		: "rgba(" + BYLAW_RGB_STRINGS[0] + ", " + TRANSLUCENT_AMT + ")",	// Zero infractions
};

const BYLAW_NAMES =
{
    2849 : "2849 - Street & Traffic Bylaw",
    2952 : "2952 - Parking Meter Bylaw",
    9344 : "9344 - Motor Vehicle Noise & Emission Abatement Bylaw",
    9978 : "9978 - Granville Mall Bylaw",
};

const SECTION_RGB_STRINGS =
[
    "102,194,165",
    "252,141,98",
    "141,160,203",
    "231,138,195",
    "166,216,84",
    "255,217,47",
    "229,196,148",
    "179,179,179",
]; // Credit: Colors based on http://colorbrewer2.org/
const SECTION_COLORS =
[
    "rgba(" + SECTION_RGB_STRINGS[0] + ", " + TRANSLUCENT_AMT + ")",
    "rgba(" + SECTION_RGB_STRINGS[1] + ", " + TRANSLUCENT_AMT + ")",
    "rgba(" + SECTION_RGB_STRINGS[2] + ", " + TRANSLUCENT_AMT + ")",
    "rgba(" + SECTION_RGB_STRINGS[3] + ", " + TRANSLUCENT_AMT + ")",
    "rgba(" + SECTION_RGB_STRINGS[4] + ", " + TRANSLUCENT_AMT + ")",
    "rgba(" + SECTION_RGB_STRINGS[5] + ", " + TRANSLUCENT_AMT + ")",
    "rgba(" + SECTION_RGB_STRINGS[6] + ", " + TRANSLUCENT_AMT + ")",
    "rgba(" + SECTION_RGB_STRINGS[7] + ", " + TRANSLUCENT_AMT + ")",
]

SECTION_BORDER_COLORS = 
[
    "rgba(" + SECTION_RGB_STRINGS[0] + ")",
    "rgba(" + SECTION_RGB_STRINGS[1] + ")",
    "rgba(" + SECTION_RGB_STRINGS[2] + ")",
    "rgba(" + SECTION_RGB_STRINGS[3] + ")",
    "rgba(" + SECTION_RGB_STRINGS[4] + ")",
    "rgba(" + SECTION_RGB_STRINGS[5] + ")",
    "rgba(" + SECTION_RGB_STRINGS[6] + ")",
    "rgba(" + SECTION_RGB_STRINGS[7] + ")",
]

var legend = null;
AddBylawLegend(); // Add the initial legend


// Chart setup:
const PERIOD_CHART_BAR_LABELS 	= ['Mon', 'Tue', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
const PERIOD_CHART_LABEL 		= "Total infractions";
const PERIOD_CHART_BAR_COLORS = // Credit: Colors sampled from the City of Vancouver logo
[
    'rgba(1, 126, 197, 0.4)',
    'rgba(137, 200, 63, 0.4)',

    'rgba(1, 126, 197, 0.4)',
    'rgba(137, 200, 63, 0.4)',

    'rgba(1, 126, 197, 0.4)',
    'rgba(137, 200, 63, 0.4)',

    'rgba(1, 126, 197, 0.4)',
    'rgba(137, 200, 63, 0.4)',
];
const PERIOD_CHART_BAR_BORDER_COLORS = 
[
    'rgba(1, 126, 197, 1)',
    'rgba(137, 200, 63, 1)',

    'rgba(1, 126, 197, 1)',
    'rgba(137, 200, 63, 1)',

    'rgba(1, 126, 197, 1)',
    'rgba(137, 200, 63, 1)',

    'rgba(1, 126, 197, 1)',
    'rgba(137, 200, 63, 1)',
];
const PERIOD_CHART_BORDER_WIDTH = 1;
var _periodChartOptions =
{
    legend :
    {
        display : false,
    },
    title : 
    {
        display : true,
        text 	: 'Total Infractions, by Weekday:'
    },
    scales: 
    {
        yAxes: 
        [
            {
                ticks: 
                {
                    beginAtZero	: true, 
                    stepSize 	: 1,
                },
                stacked 		: true,
            }
        ],
        xAxes:
        [
            {
                barPercentage 		: 1,
                categoryPercentage 	: 1,
                stacked				: true,
            }
        ]
    },
    maintainAspectRatio : false,	// Prevents stretching when we change the .periodChartControl width/height
};

// Create an inital, empty chart:
var periodChartControl 	= null;
var periodChart 		= null;
DrawPeriodChart();



// Sidebar setup:
//---------------

// create the sidebar instance and add it to the map
var sidebar = L.control.sidebar(
    {
        autopan: false,
        position: 'left',
        container: 'sidebar'
    }
    ).addTo(theMap).open('home');

// Set a notification for when the panel is opened
sidebar.on('content', function (ev) {
    switch (ev.id) {
        case 'autopan':
            sidebar.options.autopan = true;
        break;
        default:
            sidebar.options.autopan = false;
    }
});
var userid = 0
function addUser() {
    sidebar.addPanel({
        id:   'user' + userid++,
        tab:  '<i class="fa fa-user"></i>',
        title: 'User Profile ' + userid,
        pane: '<p>user ipsum dolor sit amet</p>',
    });
}



// Setup the date picker:
var _dateHasChanged = true;
HandleParkingTicketRadioToggle(2); // Call the handler, and pass index 2 to configure the UI for the 2017-2019 DB


// Set up input box listener for "enter" key
document.getElementById("searchInput").addEventListener
(
    "keydown", 
    function(event)
    {
        if (event.keyCode === 13)	// 13 == "enter" key
        {
            event.preventDefault();
            VisualizeButton();
            document.getElementById("searchInput").value = "";
        }
    }
);



// Main data visualization functionality:
//---------------------------------------

// Global variables:
const publicStreetsDBURL 	= "https://opendata.vancouver.ca/api/records/1.0/search/?dataset=public-streets";

const parkingTicketDBURLs 	= 
[
    "https://opendata.vancouver.ca/api/records/1.0/search/?dataset=parking-tickets-2010-2013", 
    "https://opendata.vancouver.ca/api/records/1.0/search/?dataset=parking-tickets-2014-2016", 
    "https://opendata.vancouver.ca/api/records/1.0/search/?dataset=parking-tickets-2017-2019",
];

const MAX_SEARCH_ROWS = 10000;	// 10,000 is the OpenData portal DB's hard max. Results are randomly dropped if there are more than this value

var assembledResults = {}; // This is our main results dictionary used for visualization, inialized in InitializeResultsDict()

// "Visualize" button functionality:
const MAX_LOAD_ZOOM = 15;
async function VisualizeButton()
{
    // Set the zoom to something reasonable:
    var currentZoom = theMap.getZoom();
    if (currentZoom < MAX_LOAD_ZOOM)
    {
        theMap.setZoom(MAX_LOAD_ZOOM, {animate: false}); // Don't animate, otherwise we won't be zoomed in time to get the correct bounds
    }

    InitializeResultsDict();

    await AssembleResultsDict(document.getElementById("searchInput").value);

    // Trigger drawing of all of our layers
    DrawAllLayers();
};


// Add the standard bylaw legend to the map
function AddBylawLegend()
{
    if (legend != null)
    {
        legend.remove();
    }

    legend = L.control({ position: "bottomleft" });

    legend.onAdd = function(theMap) 
    {
        var div = L.DomUtil.create("div", "legend");
        div.innerHTML += "<h4>Most Commonly Cited Bylaw:</h4>";
        div.innerHTML += '<i style="background: ' + BYLAW_COLORS[2849] + '"></i><span>' + BYLAW_NAMES[2849] + ' </span><br>';
        div.innerHTML += '<i style="background: ' + BYLAW_COLORS[2952] + '"></i><span>' + BYLAW_NAMES[2952] + ' </span><br>';
        div.innerHTML += '<i style="background: ' + BYLAW_COLORS[9344] + '"></i><span>' + BYLAW_NAMES[9344] + ' </span><br>';
        div.innerHTML += '<i style="background: ' + BYLAW_COLORS[9978] + '"></i><span>' + BYLAW_NAMES[9978] + ' </span><br>';
        div.innerHTML += '<i style="background: ' + BYLAW_COLORS[0] + '; border-style: solid; border-color: gray; border-width: 1px;"></i><span>No recorded infractions</span><br>';

        return div;
    };
    legend.addTo(theMap);
}


// Replace the bylaw legend text with specific section values
// bylawNumber used to construct header strings
// infractionText = Object of (section, infraction text strings) pairs
function AddSectionLegend(bylawNumber, infractionText)
{
    if (legend != null)
    {
        legend.remove();
    }

    legend = L.control({ position: "bottomleft" });

    legend.onAdd = function(theMap) 
    {
        var div = L.DomUtil.create("div", "legend");
        div.innerHTML += "<h4>Bylaw " + BYLAW_NAMES[bylawNumber] + "<br>Infraction Sections for all Tickets Issued on " + assembledResults.streetResults[_currentSelectedStreet].fullName;

        var colorIndex = 0;
        for (currentText in infractionText)
        {
            div.innerHTML += '<i style="background: ' + SECTION_BORDER_COLORS[ colorIndex % SECTION_COLORS.length ] + '"></i><span>' + currentText + ": " + infractionText[currentText] + '</span><br>';	 // Wrap the index for the section colors
            
            colorIndex++;
        }

        return div;
    };
    legend.addTo(theMap);
}


// Populates all layers, based on the current UI configuration. Must be called any time the user changes the UI
var _selectedWeekdays 	= {};
var _selectedBylaws 	= {};
var _selectedStatus 	= {};
var _isFirstDraw 		= true;	// Track: Is this the first time we've shown any UI stuff?
function DrawAllLayers()
{
    // Cache the current UI state:
    var UIStates = {};
    for (var currentLayer in overlayObjects)
    {
        if (theMap.hasLayer(overlayObjects[currentLayer]))
        {
            UIStates[currentLayer] = true;
        }
        else
        {
            UIStates[currentLayer] = false;
        }
    }

    // Cache the current UI state in our global variables
    _selectedWeekdays = 
    {
        0 : document.getElementById("sunCheckbox").checked,
        1 : document.getElementById("monCheckbox").checked,
        2 : document.getElementById("tueCheckbox").checked,
        3 : document.getElementById("wedCheckbox").checked,
        4 : document.getElementById("thuCheckbox").checked,
        5 : document.getElementById("friCheckbox").checked,
        6 : document.getElementById("satCheckbox").checked,
    };

    _selectedBylaws = 
    {
        2849 : document.getElementById("2849Checkbox").checked,
        2952 : document.getElementById("2952Checkbox").checked,
        9344 : document.getElementById("9344Checkbox").checked,
        9978 : document.getElementById("9978Checkbox").checked,
    }
    
    _selectedStatus =
    {
        IS : document.getElementById("ISCheckbox").checked,
        VA : document.getElementById("VACheckbox").checked,
        WR : document.getElementById("WRCheckbox").checked,
        VS : document.getElementById("VSCheckbox").checked,
        RA : document.getElementById("RACheckbox").checked,
        VR : document.getElementById("VRCheckbox").checked,
    };

    DrawHeatMap();

    DrawStreetsByBylawColor();

    DrawNumericMarkers();

    if (_isFirstDraw) // Bug fix: Switch from integer ticks back to auto ticks. Allows undrawn chart to have integer ticks, but drawn chart to have sensible ticks
    {
        _periodChartOptions.scales.yAxes[0].ticks = {beginAtZero : true};
    }
    DrawPeriodChart();


    // Restore the UI state:
    for (var currentLayer in overlayObjects)
    {
        if (UIStates[currentLayer] == true || _isFirstDraw)
        {
            overlayObjects[currentLayer].addTo(theMap);
        }
        else
        {
            overlayObjects[currentLayer].remove();
        }
    }

    _isFirstDraw = false;
}


// Event handler: Called whenever the user selects a checkbox in the layer control panel
function OnOverlayAddHandler(overlay)
{
    // Do nothing...
}


// Event handler: Called whenever the user deselects a checkbox in the layer control panel
function OnOverlayRemoveHandler(overlay)
{
    // Do nothing...
}


// "Constructor": Initialize the global results dictionary
function InitializeResultsDict()
{
    if (_dateHasChanged)
    {
        assembledResults = 
        {
            streetResults 	: {},
        };
        
        InitializeStats();	// Appends assembledResults.stats

        _dateHasChanged = false;
    }

}


// Helper function: Initialize/clear the assembledResults.stats
function InitializeStats()
{
    assembledResults['stats'] =  
    {
        totalInfractions	: 0,

        maximums :
        {
            block :
            {
                count 		: 0,
                streetName 	: "UNINITIALIZED_DATA",
                blockNumber	: -1,
            },
            street :
            {
                count 		: 0,
                streetName 	: "UNINITIALIZED_DATA",
            }
        },

        weekdayTotals :		// Per-weekday infraction counts. sun + mon + ... + sat == totalInfractions
        {
            0 : 0,			// 0 == Sunday
            1 : 0,			// 1 == Monday
            2 : 0,		
            3 : 0,		
            4 : 0,		
            5 : 0,		
            6 : 0,			// 6 = Saturday
        },

        weekdayBylawTotals :
        {
            0 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },	// 0 == Sunday
            1 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },	// 1 == Monday
            2 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
            3 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
            4 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
            5 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
            6 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },	// 6 = Saturday
        },

        bylawTotals : 		// Per-bylaw infraction counts. 2849 + 2952 + 9344 + 9978 == totalInfractions
        {
            2849 : 0,
            2952 : 0,
            9344 : 0,
            9978 : 0
        },

        statusTotals : 
        {
            IS : 0,
            VA : 0,
            WR : 0,
            VS : 0,
            RA : 0,
            VR : 0,
        },

        // Debug:
        numLatLngs			: 0,
    };
}


// Draw a chart representing the total infractions for the current period
function DrawPeriodChart()
{
    // First-time chart initialization:
    if (periodChartControl == null || periodChart == null)
    {
        periodChartControl 			= L.control({ position: "topleft" });
        periodChartControl.onAdd 	= function(theMap) 
        {			
            this._div = L.DomUtil.create('div', 'periodChartControl');
            this._div.innerHTML += '<canvas id="periodChartCanvas" ></canvas>';
            return this._div;
        };
        periodChartControl.addTo(theMap);
        
        periodChart = new Chart(document.getElementById("periodChartCanvas"), 
        {
            type: 'bar',
            data:
            {
                labels: PERIOD_CHART_BAR_LABELS,
                datasets: 
                [
                    {
                        label			: PERIOD_CHART_LABEL,
                        data			: [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor	: PERIOD_CHART_BAR_COLORS,
                        borderColor		: PERIOD_CHART_BAR_BORDER_COLORS,
                        borderWidth		: PERIOD_CHART_BORDER_WIDTH,
                    }
                ]
            },
            options: _periodChartOptions,
        });
    }
    else // Update the chart:
    {	
        var newData = 
        {
            labels	: PERIOD_CHART_BAR_LABELS,
            datasets: 
            [
                {
                    label			: "Bylaw 2849",
                    data			: 
                    [	
                        assembledResults.stats.weekdayBylawTotals[1][2849], 
                        assembledResults.stats.weekdayBylawTotals[2][2849],
                        assembledResults.stats.weekdayBylawTotals[3][2849], 
                        assembledResults.stats.weekdayBylawTotals[4][2849], 
                        assembledResults.stats.weekdayBylawTotals[5][2849], 
                        assembledResults.stats.weekdayBylawTotals[6][2849],
                        assembledResults.stats.weekdayBylawTotals[0][2849], // Order is Mon-Sun, so we put index 0 last
                    ], 
                    backgroundColor	: BYLAW_TRANSLUCENT_COLORS[2849],
                    borderColor		: BYLAW_COLORS[2849],
                    borderWidth		: PERIOD_CHART_BORDER_WIDTH,
                },

                {
                    label			: "Bylaw 2952",
                    data			: 
                    [	
                        assembledResults.stats.weekdayBylawTotals[1][2952], 
                        assembledResults.stats.weekdayBylawTotals[2][2952],
                        assembledResults.stats.weekdayBylawTotals[3][2952], 
                        assembledResults.stats.weekdayBylawTotals[4][2952], 
                        assembledResults.stats.weekdayBylawTotals[5][2952], 
                        assembledResults.stats.weekdayBylawTotals[6][2952],
                        assembledResults.stats.weekdayBylawTotals[0][2952], 
                    ], 
                    backgroundColor	: BYLAW_TRANSLUCENT_COLORS[2952],
                    borderColor		: BYLAW_COLORS[2952],
                    borderWidth		: PERIOD_CHART_BORDER_WIDTH,
                },
                {
                    label			: "Bylaw 9344",
                    data			: 
                    [	
                        assembledResults.stats.weekdayBylawTotals[1][9344], 
                        assembledResults.stats.weekdayBylawTotals[2][9344],
                        assembledResults.stats.weekdayBylawTotals[3][9344], 
                        assembledResults.stats.weekdayBylawTotals[4][9344], 
                        assembledResults.stats.weekdayBylawTotals[5][9344], 
                        assembledResults.stats.weekdayBylawTotals[6][9344],
                        assembledResults.stats.weekdayBylawTotals[0][9344], 
                    ], 
                    backgroundColor	: BYLAW_TRANSLUCENT_COLORS[9344],
                    borderColor		: BYLAW_COLORS[9344],
                    borderWidth		: PERIOD_CHART_BORDER_WIDTH,
                },
                {
                    label			: "Bylaw 9978",
                    data			: 
                    [	
                        assembledResults.stats.weekdayBylawTotals[1][9978], 
                        assembledResults.stats.weekdayBylawTotals[2][9978],
                        assembledResults.stats.weekdayBylawTotals[3][9978], 
                        assembledResults.stats.weekdayBylawTotals[4][9978], 
                        assembledResults.stats.weekdayBylawTotals[5][9978], 
                        assembledResults.stats.weekdayBylawTotals[6][9978],
                        assembledResults.stats.weekdayBylawTotals[0][9978], 
                    ], 
                    backgroundColor	: BYLAW_TRANSLUCENT_COLORS[9978],
                    borderColor		: BYLAW_COLORS[9978],
                    borderWidth		: PERIOD_CHART_BORDER_WIDTH,
                },
            ]
        };

        periodChart.data = newData;

        _periodChartOptions.title.text = [GetPrettyDateString(), GetPrettyNumberString(assembledResults.stats.totalInfractions) + " Infractions Total, by Weekday:"];
        
        periodChart.options = _periodChartOptions;

        periodChart.update(0); // Prevent animation when user interacts with UI
    }
}


// Draw a chart representing the total infractions for the current period
function DrawStreetPeriodChart(street)
{
    var streetCounts = GetStreetBylawWeekdaysValidInfractionCounts(street);

    var newData = 
    {
        labels	: PERIOD_CHART_BAR_LABELS,
        datasets: 
        [
            {
                label			: "Bylaw 2849",
                data : 
                [
                    streetCounts[1][2849],
                    streetCounts[2][2849],
                    streetCounts[3][2849],
                    streetCounts[4][2849],
                    streetCounts[5][2849],
                    streetCounts[6][2849],
                    streetCounts[0][2849],	// Order is Mon-Sun, so we put index 0 last
                ],

                backgroundColor	: BYLAW_TRANSLUCENT_COLORS[2849],
                borderColor		: BYLAW_COLORS[2849],
                borderWidth		: PERIOD_CHART_BORDER_WIDTH,
            },
            {
                label			: "Bylaw 2952",
                data : 
                [
                    streetCounts[1][2952],
                    streetCounts[2][2952],
                    streetCounts[3][2952],
                    streetCounts[4][2952],
                    streetCounts[5][2952],
                    streetCounts[6][2952],
                    streetCounts[0][2952],
                ],

                backgroundColor	: BYLAW_TRANSLUCENT_COLORS[2952],
                borderColor		: BYLAW_COLORS[2952],
                borderWidth		: PERIOD_CHART_BORDER_WIDTH,
            },
            {
                label			: "Bylaw 9344",
                data : 
                [
                    streetCounts[1][9344],
                    streetCounts[2][9344],
                    streetCounts[3][9344],
                    streetCounts[4][9344],
                    streetCounts[5][9344],
                    streetCounts[6][9344],
                    streetCounts[0][9344],
                ],

                backgroundColor	: BYLAW_TRANSLUCENT_COLORS[9344],
                borderColor		: BYLAW_COLORS[9344],
                borderWidth		: PERIOD_CHART_BORDER_WIDTH,
            },
            {
                label			: "Bylaw 9978",
                data : 
                [
                    streetCounts[1][9978],
                    streetCounts[2][9978],
                    streetCounts[3][9978],
                    streetCounts[4][9978],
                    streetCounts[5][9978],
                    streetCounts[6][9978],
                    streetCounts[0][9978],
                ],

                backgroundColor	: BYLAW_TRANSLUCENT_COLORS[9978],
                borderColor		: BYLAW_COLORS[9978],
                borderWidth		: PERIOD_CHART_BORDER_WIDTH,
            },
        ]
    };

    periodChart.data = newData;

    _periodChartOptions.title.text 	= [assembledResults.streetResults[street].fullName, GetPrettyDateString(), GetPrettyNumberString(GetValidStreetInfractionsCount(assembledResults.streetResults[street])) + " Infractions Total, by Weekday"];
    periodChart.options 			= _periodChartOptions;

    periodChart.update();
}


// Draw a chart of the specific infractions for a selected bylaw, for the current period
function DrawStreetInfractionPeriodChart(street, bylaw)
{
    // Need an array for each section
    var sections 		= {}; 	// sections[i] == per section, sections[i][j] == [0,6] weekdays, sections[i][j][k] = counts for weekday

    var infractionText 	= {};	// Used to assemble strings for the legend

    for (var currentBlock in assembledResults.streetResults[street].block)
    {
        for (var currentInfraction = 0; currentInfraction < assembledResults.streetResults[street].block[currentBlock].infractions.length; currentInfraction++)
        {
            if (assembledResults.streetResults[street].block[currentBlock].infractions[currentInfraction].bylaw == bylaw)
            {
                var currentSection 	= assembledResults.streetResults[street].block[currentBlock].infractions[currentInfraction].section;
                var weekday 		= parseInt(assembledResults.streetResults[street].block[currentBlock].infractions[currentInfraction].weekday );

                // Switch indexes so Sunday is the last element, instead of the 1st (for display):
                if (weekday == 0)
                {
                    weekday = 6;
                }
                else
                {
                    weekday--;
                }

                // Initialize the section if we've not seen it before:
                if (!sections[currentSection])
                {							
                    sections[currentSection] = [0,0,0,0,0,0,0]; // Initalize 7 weekdays as 0
                }

                sections[currentSection][weekday] += 1;

                // Add infraction text:
                if (!infractionText[currentSection])
                {
                    infractionText[currentSection] = FormatNiceNameString(assembledResults.streetResults[street].block[currentBlock].infractions[currentInfraction].infractiontext);
                }						
            }
        }
    }

    var newData = 
    {
        labels 	: PERIOD_CHART_BAR_LABELS,
        datasets: [],
    };

    var sectionColorIndex = 0;
    for (currentSection in sections)
    {
        var newDatasetObject = 
        {
                label			: "Section " + currentSection,
                data			: sections[currentSection],
                backgroundColor	: SECTION_COLORS[sectionColorIndex % SECTION_COLORS.length],
                borderColor		: SECTION_BORDER_COLORS[sectionColorIndex % SECTION_COLORS.length],
                borderWidth		: PERIOD_CHART_BORDER_WIDTH,
        };

        newData.datasets.push(newDatasetObject);
        sectionColorIndex++;
    }

    periodChart.data = newData;

    _periodChartOptions.title.text =
    [
        assembledResults.streetResults[street].fullName,
        GetPrettyDateString(),
        GetValidStreetBylawInfractionCount(assembledResults.streetResults[street], bylaw) + " Total Infractions for Bylaw " + bylaw + ", by Weekday",
    ];
         
    periodChart.options = _periodChartOptions;

    periodChart.update();

    // Replace the legend:
    AddSectionLegend(bylaw, infractionText);
}


// Draw numeric markers:
const POPUP_OPTIONS 	= {maxWidth : 'auto', maxHeight : 'auto'};	// Used for all popups
const TOOLTIP_OPTIONS 	= {opacity : 0.75 };
function DrawNumericMarkers()
{
    layerControls.removeLayer(overlayObjects[NUMERIC_MARKERS_OVERLAY_NAME]);
    overlayObjects[NUMERIC_MARKERS_OVERLAY_NAME].remove();

    var markers = [];

    for (var currentStreet in assembledResults.streetResults)
    {
        var largestBlock = GetLargestBlockOfStreet(assembledResults.streetResults[currentStreet]);

        for (var currentBlock in assembledResults.streetResults[currentStreet].block)
        {
            var blockTotal = GetValidBlockInfractionCount(assembledResults.streetResults[currentStreet].block[currentBlock]);					

            // If we found any infractions, color the lines
            var lineSegment;
            if (blockTotal > 0)
            {
                // Choose the icon color:
                var iconClass 				= "marker-icon.png";	// Initialize as leaflet's default marker as a safety backup
                var iconDimensions 			= [25, 41];				// .png file width, height dimensions
                var iconAnchorOffset		= [12, 41];
                var iconAnchorOffsetLarge 	= [25, 82];
                
                var largestBylaw 		= GetLargestValidBylawOfBlock(currentStreet, currentBlock);
                switch(parseInt(largestBylaw))
                {
                    case 2849:
                        if (parseInt(currentBlock) == parseInt(largestBlock))
                        {
                            iconClass 			= "dot-icon-2x_2849";
                            iconDimensions 		= [50, 82];
                            iconAnchorOffset	= iconAnchorOffsetLarge;
                        }
                        else
                        {
                            iconClass 			= "dot-icon_2849";
                        }
                        
                    break;

                    case 2952:
                        if (parseInt(currentBlock) == parseInt(largestBlock))
                        {
                            iconClass 			= "dot-icon-2x_2952";
                            iconDimensions 		= [50, 82];
                            iconAnchorOffset	= iconAnchorOffsetLarge;
                        }
                        else
                        {
                            iconClass 			= "dot-icon_2952";
                        }
                        
                    break;

                    case 9344:
                        if (parseInt(currentBlock) == parseInt(largestBlock))
                        {
                            iconClass 			= "dot-icon-2x_9344";
                            iconDimensions 		= [50, 82];
                            iconAnchorOffset	= iconAnchorOffsetLarge;
                        }
                        else
                        {
                            iconClass 			= "dot-icon_9344";
                        }
                        
                    break;

                    case 9978:
                        if (parseInt(currentBlock) == parseInt(largestBlock))
                        {
                            iconClass 			= "dot-icon-2x_9978";
                            iconDimensions 		= [50, 82];
                            iconAnchorOffset	= iconAnchorOffsetLarge;
                        }
                        else
                        {
                            iconClass 			= "dot-icon_9978";
                        }								
                    break;

                    default:
                        console.log("Error: DrawNumericMarkers() received an invalid largest bylaw " + largestBylaw);
                }

                var numberIcon = L.divIcon(
                {
                    className	: iconClass,		// CSS class name
                    iconSize 	: iconDimensions,	// Size of the source image, in pixels
                    iconAnchor	: iconAnchorOffset,	// Coordinates of icon tip, relative to its top left corner
                    popupAnchor	: [3, -40],
                    html		: blockTotal,
                });

                var newMarker = L.marker(assembledResults.streetResults[currentStreet].block[currentBlock].midPoint, {icon: numberIcon});

                // Cache stuff required for interactions:
                newMarker.on("popupopen", PolylineAndMarkerPopupOpenHandler);
                newMarker.on("popupclose", PolylineAndMarkerPopupCloseHandler);
                newMarker['street'] 			= currentStreet;
                newMarker['block'] 			= currentBlock;
                newMarker['popupID'] 			= currentBlock + currentStreet + "PopupID";

                newMarker.bindTooltip(currentBlock + " " + assembledResults.streetResults[currentStreet].fullName, TOOLTIP_OPTIONS);
                

                const popupHTML = '<div class="popupCanvasDiv"><canvas id="popupCanvas"></canvas></div>';

                newMarker.bindPopup(popupHTML, POPUP_OPTIONS);

                markers.push( newMarker );
            }
        }
    }

    overlayObjects[NUMERIC_MARKERS_OVERLAY_NAME] = L.layerGroup(markers).addTo(theMap);
    layerControls.addOverlay(overlayObjects[NUMERIC_MARKERS_OVERLAY_NAME], NUMERIC_MARKERS_OVERLAY_NAME);
}


// Draw streetlines, colored based on the most common infraction type
// Should never be called directly: Call DrawAllLayers() instead
function DrawStreetsByBylawColor()
{
    layerControls.removeLayer(overlayObjects[BYLAW_ROADS_OVERLAY_NAME]);
    overlayObjects[BYLAW_ROADS_OVERLAY_NAME].remove();

    var polylines = [];

    for (var currentStreet in assembledResults.streetResults)
    {
        var streetMax = GetTotalOfLargestBlockOfStreet(assembledResults.streetResults[currentStreet]);

        for (var currentBlock in assembledResults.streetResults[currentStreet].block)
        {
            
            var bylawCounts 	= {};	// Track counts of infractions for the 4 parking bylaws in Vancouver: 2849, 2952, 9344, 9978

            // Count the number of valid bylaw infractions for the current block:
            for (currentInfraction = 0; currentInfraction < assembledResults.streetResults[currentStreet].block[currentBlock].infractions.length; currentInfraction++)
            {
                if (IsValidInfraction(assembledResults.streetResults[currentStreet].block[currentBlock].infractions[currentInfraction]))
                {
                    // Increment existing record, or create one with a value of 0 if it doesn't exist
                    bylawCounts[ assembledResults.streetResults[currentStreet].block[currentBlock].infractions[currentInfraction].bylaw ] = (bylawCounts[ assembledResults.streetResults[currentStreet].block[currentBlock].infractions[currentInfraction].bylaw ] || 0) + 1;
                }
            }

            const popupHTML = '<div class="popupCanvasDiv"><canvas id="popupCanvas"></canvas></div>';

            // If we found any infractions, color the lines
            var lineSegment;
            if (Object.keys(bylawCounts).length != 0)
            {
                // Find the max:
                var maxCountIndex 	= -1;
                var maxCount 		= -1;
                var blockTotalInfractions = 0;
                for (var currentCount in bylawCounts)
                {
                    if (bylawCounts[currentCount] > maxCount)
                    {
                        maxCount 		= bylawCounts[currentCount];
                        maxCountIndex 	= currentCount;
                    }

                    // Count the total:
                    blockTotalInfractions += bylawCounts[currentCount];
                }

                // Draw lines and cache them in our results dictionary
                for (currentSegment = 0; currentSegment < assembledResults.streetResults[currentStreet].block[currentBlock].latLngs.length; currentSegment++)
                {
                    // Normalize to [0.25, 1]
                    var opacityVal = (((blockTotalInfractions / streetMax) * 0.75) + 0.25); // [0,1] -> [0, 0.75] -> [0.25, 1]

                    lineSegment = L.polyline(assembledResults.streetResults[currentStreet].block[currentBlock].latLngs[currentSegment], {color: BYLAW_COLORS[maxCountIndex], opacity: opacityVal, weight : 4});

                    // Cache stuff required for interactions:
                    lineSegment.on("popupopen", PolylineAndMarkerPopupOpenHandler);
                    lineSegment.on("popupclose", PolylineAndMarkerPopupCloseHandler);
                    lineSegment['street'] 			= currentStreet;
                    lineSegment['block'] 			= currentBlock;
                    lineSegment['popupID'] 			= currentBlock + currentStreet + "PopupID";

                    lineSegment.bindPopup(popupHTML, POPUP_OPTIONS);

                    lineSegment.bindTooltip(currentBlock + " " + assembledResults.streetResults[currentStreet].fullName, TOOLTIP_OPTIONS);

                    polylines.push( lineSegment );
                }
            }
            else // Draw a "empty" line if no offenses exist
            {
                for (currentSegment = 0; currentSegment < assembledResults.streetResults[currentStreet].block[currentBlock].latLngs.length; currentSegment++)
                {
                    // We don't need to bind interactions for "empty" streets
                    lineSegment = L.polyline(assembledResults.streetResults[currentStreet].block[currentBlock].latLngs[currentSegment], {color: BYLAW_COLORS[0]});

                    lineSegment.bindTooltip(currentBlock + " " + assembledResults.streetResults[currentStreet].fullName, TOOLTIP_OPTIONS);

                    polylines.push( lineSegment );
                }
            }
        }
    }

    overlayObjects[BYLAW_ROADS_OVERLAY_NAME] = L.layerGroup(polylines).addTo(theMap);
    layerControls.addOverlay(overlayObjects[BYLAW_ROADS_OVERLAY_NAME], BYLAW_ROADS_OVERLAY_NAME);
}


// Configuration stuff for per-block popups:
const BLOCK_CHART_LABEL 			= "Total infractions for "; // Start of the label string: Append block and street name
const BLOCK_CHART_BYLAW_CATEGORIES 	= [ "Bylaw 2849", "Bylaw 2952", "Bylaw 9344", "Bylaw 9978" ];
var _blockChartOptions =
{
    legend :
    {
        display : false,
    },
    title : 
    {
        display 	: true,
        fontColor 	: 'black',
        // fontStyle 	: 'bold',
        fontSize 	: 14,
        position	: "bottom",
    },
    onClick : BlockChartOnClick,
};


// State cache for polyline popup handling:
var _currentPopupChart 		= null;
var _currentSelectedStreet 	= null;
var _currentSelectedBlock 	= null;
var _currentBlockPopup 		= null;

// Handler for popups that open when polylines are clicked
function PolylineAndMarkerPopupOpenHandler(theEvent)
{
    // Count the valid per infractions for the selected block:
    var blockTotals = [0,0,0,0]; // 0 == 2849, 1 == 2952, 2 == 9344, 3 == 9978
    for (var currentInfraction = 0; currentInfraction < assembledResults.streetResults[theEvent.sourceTarget.street].block[theEvent.sourceTarget.block].infractions.length; currentInfraction++)
    {
        if (IsValidInfraction(assembledResults.streetResults[theEvent.sourceTarget.street].block[theEvent.sourceTarget.block].infractions[currentInfraction]) )
        {
            switch(assembledResults.streetResults[theEvent.sourceTarget.street].block[theEvent.sourceTarget.block].infractions[currentInfraction].bylaw)
            {
                case 2849:
                    blockTotals[0]++;
                    break;
                case 2952:
                    blockTotals[1]++;
                    break;
                case 9344:
                    blockTotals[2]++;
                    break;
                case 9978:
                    blockTotals[3]++;
                    break;
                default:
                    console.log("Error! PolylineAndMarkerPopupOpenHandler found a block with invalid bylaw " + assembledResults.streetResults[theEvent.sourceTarget.street].block[theEvent.sourceTarget.block].infractions[currentInfraction].bylaw);
            }
        }
    }

    var popupCanvas = document.getElementById("popupCanvas");
    if (popupCanvas == null)
    {
        console.log("PolylineAndMarkerPopupOpenHandler() could not find popup canvas");
        return;
    }			

    // Assemble a chart:
    var blockLabel = BLOCK_CHART_LABEL + theEvent.sourceTarget.block + " " + theEvent.sourceTarget.street;
    _blockChartOptions.title.text = 
    [
        theEvent.sourceTarget.block + "'s block, " + assembledResults.streetResults[theEvent.sourceTarget.street].fullName, 
        GetValidBlockInfractionCount(assembledResults.streetResults[theEvent.sourceTarget.street].block[theEvent.sourceTarget.block]) + " Infractions Total, by Bylaw",
    ];

    _currentPopupChart = new Chart(popupCanvas,
    {
        type: 'doughnut',
        data:
        {
            labels: BLOCK_CHART_BYLAW_CATEGORIES,
            datasets: 
            [
                {
                    label			: blockLabel,
                    data			: blockTotals,
                    backgroundColor	: 
                    [
                        BYLAW_TRANSLUCENT_COLORS[2849], BYLAW_TRANSLUCENT_COLORS[2952], BYLAW_TRANSLUCENT_COLORS[9344], BYLAW_TRANSLUCENT_COLORS[9978]
                    ],
                    borderColor		: 
                    [
                        BYLAW_COLORS[2849], BYLAW_COLORS[2952], BYLAW_COLORS[9344], BYLAW_COLORS[9978] 
                    ],
                    borderWidth		: PERIOD_CHART_BORDER_WIDTH,
                }
            ]
        },
        options: _blockChartOptions,
    });
    
    // Swap the period graph, for a per-street graph
    DrawStreetPeriodChart(theEvent.sourceTarget.street);

    // Cache off our selection incase the user interacts with it
    _currentSelectedBlock 	= theEvent.sourceTarget.block;
    _currentSelectedStreet 	= theEvent.sourceTarget.street;
    _currentBlockPopup 		= theEvent.popup;
}


function PolylineAndMarkerPopupCloseHandler(polylineEvent)
{
    // Remove the element, so a new one can be drawn fresh on the next popup open
    document.getElementById("popupCanvas").remove();

    // Swap the per-street graph, back to a period graph
    DrawPeriodChart();

    // Add the bylaw legend back:
    AddBylawLegend();

    // Reset our tracking flag
    viewingBlockSections = false;
}


// Handler: Switch the chart to a breakdown of the specific infractions for the selected bylaw
var viewingBlockSections = false;	// Tracker: Are we viewing the section breakdown for a block?
function BlockChartOnClick(clickEvent)
{
    if (viewingBlockSections == true)
    {
        return;
    }

    // Handle clicks not on the chart
    var eventElements = _currentPopupChart.getElementsAtEvent(clickEvent);
    if (!eventElements || !eventElements[0])
    {
        return;
    }
    else
    {
        viewingBlockSections = true;
    }

    // Build our data:
    var selectedBylaw;
    switch(_currentPopupChart.getElementsAtEvent(clickEvent)[0]._index) // Get the index [0, 3] to determine what part of the graph was clicked
    {
        case 0:	// 2849
            selectedBylaw = 2849;
        break;
        case 1:	// 2952
            selectedBylaw = 2952;
        break;
        case 2:	// 9344
            selectedBylaw = 9344;
        break;
        case 3:	// 9978
            selectedBylaw = 9978;
        break;
        default:
            console.log("BlockChartOnClick found an out of bounds index " + _currentPopupChart.getElementsAtEvent(clickEvent)[0]._index);
    }

    var infractionsAndCounts = {};
    for (var currentInfraction = 0; currentInfraction < assembledResults.streetResults[_currentSelectedStreet].block[_currentSelectedBlock].infractions.length; currentInfraction++)
    {
        if (assembledResults.streetResults[_currentSelectedStreet].block[_currentSelectedBlock].infractions[currentInfraction].bylaw == selectedBylaw)
        {
            var infractionText = assembledResults.streetResults[_currentSelectedStreet].block[_currentSelectedBlock].infractions[currentInfraction].infractiontext;
            infractionText = FormatNiceNameString(infractionText);

            var currentSection = assembledResults.streetResults[_currentSelectedStreet].block[_currentSelectedBlock].infractions[currentInfraction].section;

            infractionsAndCounts[currentSection] = 
            {
                infractionCount : (infractionsAndCounts[currentSection] ? infractionsAndCounts[currentSection].infractionCount + 1 : 1), // If no entry exists, create it. Otherwise, increment it by 1
                infractionText 	: infractionText,
            };
        }
    }

    // Convert our data into the array format the charts expect:
    var specificInfractionCounts 	= [];
    var specificInfractionSection 	= [];

    for (var currentEntry in infractionsAndCounts)
    {
        specificInfractionCounts.push(infractionsAndCounts[currentEntry].infractionCount);
        specificInfractionSection.push("Section " + currentEntry);
    }

    // Change the title popup
    _currentPopupChart.options.title.text = 
    [
        _currentSelectedBlock + "'s block, " + assembledResults.streetResults[_currentSelectedStreet].fullName, 
        GetValidBlockBylawInfractionCount(assembledResults.streetResults[_currentSelectedStreet].block[_currentSelectedBlock], selectedBylaw) + " Infractions Total, by Bylaw Section"
    ];

    // Update the chart and redraw it:
    var newData =
    {
        labels: specificInfractionSection,
        datasets:
        [
            {
                label			: 'Bylaw infractions by section',
                data 			: specificInfractionCounts,
                backgroundColor : SECTION_COLORS, 
                borderColor 	: SECTION_BORDER_COLORS,
                borderWidth		: 1,
            }
        ],
    };
    
    _currentPopupChart.data = newData;
    _currentPopupChart.update();
    
    DrawStreetInfractionPeriodChart(_currentSelectedStreet, selectedBylaw);
}


// Configures the heatmap layer
// Should never be called directly: Call DrawAllLayers() instead
function DrawHeatMap()
{
    // Assemble the data required to draw a per-block heatmap of infraction counts:
    var heatmapVals 	= [];
    var maxBlockCount 	= GetMaxValidBlockInfractions();
    if (maxBlockCount > 0)
    {
        for (var currentStreet in assembledResults.streetResults)
        {
            for (var currentBlock in assembledResults.streetResults[currentStreet].block)
            {
                var infractionRatio = GetValidBlockInfractionCount(assembledResults.streetResults[currentStreet].block[currentBlock]) / maxBlockCount;
                if (infractionRatio > 0)
                {
                    heatmapVals.push([ assembledResults.streetResults[currentStreet].block[currentBlock].midPoint[0], assembledResults.streetResults[currentStreet].block[currentBlock].midPoint[1], infractionRatio]);				
                }						
            }
        }
    }
    
    // Destroy any existing map and overlay layers:
    layerControls.removeLayer(overlayObjects[HEATMAP_OVERLAY_NAME]);
    overlayObjects[HEATMAP_OVERLAY_NAME].remove();

    // Create a new layer, add it to the map and overlay controls:
    var heatmapOptions =
    {
        radius		: 90,
        blur		: 25,
        minOpacity 	: 0.1,
        gradient 	: { 0.2 : '#fee0d2',  0.5 : '#fc9272', 0.8 : '#de2d26' }, // Red hues
    };
    
    overlayObjects[HEATMAP_OVERLAY_NAME] = L.heatLayer(heatmapVals, heatmapOptions).addTo(theMap);
    layerControls.addOverlay(overlayObjects[HEATMAP_OVERLAY_NAME], HEATMAP_OVERLAY_NAME);
}


// Helper function: Checks if a parking infraction is valid for display, given the current UI configuration
// infraction == An element of the assembledResults.streetResults['streetName'].block['blockNumber'].infractions array
function IsValidInfraction(infraction)
{
    return _selectedWeekdays[infraction.weekday] == true && _selectedBylaws[infraction.bylaw] == true && _selectedStatus[infraction.status] == true;
}


// Get the block number that has the largest number of valid infractions for the current street
// Returns a hundred-block number, or -1
function GetLargestBlockOfStreet(street)
{
    var maxValidInfractions = -1;
    var largestBlock = -1;
    for (currentBlock in street.block)
    {
        var validBlockInfractions = GetValidBlockInfractionCount(street.block[currentBlock]);
        if (validBlockInfractions > maxValidInfractions)
        {
            maxValidInfractions = validBlockInfractions;
            largestBlock = currentBlock;
        }
    }

    return largestBlock;
}


// Get the largest number of valid infractions for all blocks on the current street 
function GetTotalOfLargestBlockOfStreet(street)
{
    var maxValidInfractions = 0;

    for (currentBlock in street.block)
    {
        var validBlockInfractions = GetValidBlockInfractionCount(street.block[currentBlock]);
        if (validBlockInfractions > maxValidInfractions)
        {
            maxValidInfractions = validBlockInfractions;
        }
    }

    return maxValidInfractions;
}


// Get an array of bylaw counts
// Returns bylaw number (eg. 2849, 2952, 9344, 9978), or -1 if no valid infractions exist
function GetLargestValidBylawOfBlock(street, block)
{
    var bylawCounts 	= {};	// Track counts of infractions for the 4 parking bylaws in Vancouver: 2849, 2952, 9344, 9978

    // Count the number of valid bylaw infractions for the current block:
    for (currentInfraction = 0; currentInfraction < assembledResults.streetResults[street].block[block].infractions.length; currentInfraction++)
    {
        if (IsValidInfraction(assembledResults.streetResults[street].block[block].infractions[currentInfraction]))
        {
            // Increment existing record, or create one with a value of 0 if it doesn't exist
            bylawCounts[ assembledResults.streetResults[street].block[block].infractions[currentInfraction].bylaw ] = (bylawCounts[ assembledResults.streetResults[street].block[block].infractions[currentInfraction].bylaw ] || 0) + 1;
        }
    }

    // Find the max:
    var maxCountIndex 	= -1;
    var maxCount 		= -1;
    for (var currentCount in bylawCounts)
    {
        if (bylawCounts[currentCount] > maxCount)
        {
            maxCount 		= bylawCounts[currentCount];
            maxCountIndex 	= currentCount;
        }
    }

    return maxCountIndex;
}


// Returns a sum of the total number of infractions that are considered "valid" based on the user's UI configuration
function GetTotalValidInfractionCount()
{
    var infractionCount = 0;

    // Count valid weekdays:
    for (var currentWeekday in _selectedWeekdays)
    {
        if (_selectedWeekdays[currentWeekday] == true)
        {
            infractionCount += assembledResults.stats.weekdayTotals[currentWeekday];
        }
    }
    // Count valid bylaws:
    for (var currentBylaw in _selectedBylaws)
    {
        if (_selectedBylaws[currentBylaw] == true)
        {
            infractionCount += assembledResults.stats.bylawTotals[currentBylaw];
        }
    }
    // Count valid statuses:
    for (var currentStatus in _selectedStatus)
    {
        if (_selectedStatus[currentStatus] == true)
        {
            infractionCount += assembledResults.stats.statusTotals[currentStatus];
        }
    }

    return infractionCount;
}


// Find the largest number of tickets issued on a block, given the user's UI configuration
function GetMaxValidBlockInfractions()
{
    // Ensure the assembled results have been assembled
    if (!assembledResults || !assembledResults.streetResults)
    {
        return 0;
    }

    var max = 0;

    for (currentStreet in assembledResults.streetResults)
    {
        for (currentBlock in assembledResults.streetResults[currentStreet].block)
        {
            var validInfractions = 0;
            for (currentInfraction = 0; currentInfraction < assembledResults.streetResults[currentStreet].block[currentBlock].infractions.length; currentInfraction++)
            {
                if (IsValidInfraction(assembledResults.streetResults[currentStreet].block[currentBlock].infractions[currentInfraction]))
                {
                    validInfractions++;
                }
            }
            if (validInfractions > max)
            {
                max = validInfractions;
            }
        }
    }

    return max;
}


// Returns an array of valid infraction counts, based on the user's current UI configuration
function GetStreetBylawWeekdaysValidInfractionCounts(street)
{
    var validWeekdayCounts = 
    {
        0 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
        1 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
        2 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
        3 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
        4 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
        5 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
        6 : { 2849 : 0, 2952 : 0, 9344 : 0, 9978 : 0 },
    };

    for (var currentBlock in assembledResults.streetResults[street].block)
    {
        for (currentInfraction = 0; currentInfraction < assembledResults.streetResults[street].block[currentBlock].infractions.length; currentInfraction++)
        {
            if (IsValidInfraction(assembledResults.streetResults[street].block[currentBlock].infractions[currentInfraction]))
            {
                validWeekdayCounts[assembledResults.streetResults[street].block[currentBlock].infractions[currentInfraction].weekday][assembledResults.streetResults[street].block[currentBlock].infractions[currentInfraction].bylaw]++;
            }
        }
    }

    return validWeekdayCounts;
}


// Find the number of valid infractions for a given street
function GetValidStreetInfractionsCount(street)
{
    var total = 0;
    for (currentBlock in street.block)
    {
        for (currentInfraction in street.block[currentBlock].infractions)
        {
            if (IsValidInfraction(street.block[currentBlock].infractions[currentInfraction]))
            {
                total++;
            }
        }
    }

    return total;
}


// Find the number of valid infractions for a given block
// block == an element of the assembledResults.streetResuts['streetName'].block[] array
function GetValidBlockInfractionCount(block)
{
    if (block.infractions.length == 0)
    {
        return 0;
    }

    var total = 0;

    for (currentInfraction = 0; currentInfraction < block.infractions.length; currentInfraction++)
    {
        if (IsValidInfraction(block.infractions[currentInfraction]))
        {
            total++;
        }
    }

    return total;
}


// Get the number of valid infractions for a specific bylaw, on a specific block
function GetValidBlockBylawInfractionCount(block, bylaw)
{
    if (block.infractions.length == 0)
    {
        return 0;
    }

    var total = 0;

    for (currentInfraction = 0; currentInfraction < block.infractions.length; currentInfraction++)
    {
        if (block.infractions[currentInfraction].bylaw == bylaw && IsValidInfraction(block.infractions[currentInfraction]))
        {
            total++;
        }
    }

    return total;
}


// Get the number of valid infractions for a specific bylaw, on an entire street
function GetValidStreetBylawInfractionCount(street, bylaw)
{
    var total = 0;

    for (currentBlock in street.block)
    {
        total += GetValidBlockBylawInfractionCount(street.block[currentBlock], bylaw);
    }

    return total;
}


// Assemble date range component of a DB search query, and return it as a string
function GetDateAsSearchString()
{
    var selectedDates = datePicker.toString('YYYY-MM-DD').replace(/\s+/g, '');	// Get the date as a '-' seperated string, with no spaces
    
    const slash 			= "%2F";
    var dateSearchString 	= "";	// + startYear + slash + startMonth + slash + startDay;

    dateStringElements = selectedDates.split("-");	// Split a string like "2019-09-29-2019-10-05" based on dashes
    
    var startYear 	= Number(dateStringElements[0]);
    var startMonth 	= Number(dateStringElements[1]);
    var startDay 	= Number(dateStringElements[2]);

    var endYear 	= Number(dateStringElements[3]);
    var endMonth 	= Number(dateStringElements[4]);
    var endDay 		= Number(dateStringElements[5]);		
    
    // Handle single day selections:
    if (isNaN(dateStringElements[3]) || (startYear == endYear && startMonth == endMonth && startDay == endDay))
    {
        dateSearchString = "&refine.entrydate=" + startYear + slash + startMonth + slash + startDay;

        return dateSearchString;
    }

    // Otherwise, construct a date range search string:
    // Handle 2+ days within a month			
    var isDone = false; // Do we need to add anything else to the string?
    var finalDay;
    if (startYear == endYear && startMonth == endMonth)
    {
        finalDay = endDay;
        isDone = true;
    }
    else
    {
        finalDay = Number(moment(startYear + "-" + startMonth, "YYYY-MM").daysInMonth() );				
    }

    // Handle remaining days of the month
    for (i = startDay; i <= finalDay; i++)
    {
        dateSearchString += "&refine.entrydate=" + startYear + slash + startMonth + slash + i;
    }
    
    if (!isDone) // Does the range extend beyond the current month?
    {
        // Handle remaining months in the year
        var finalMonth;
        if (startYear == endYear)
        {
            finalMonth = endMonth;
            isDone = true;
        }
        else
        {
            finalMonth = 13; // == 12 + 1: So we will still get month 12 when we compare currentMonth < finalMonth
        }
        // Append the months between the first month, and last month/end of the year:
        for (currentMonth = startMonth + 1; currentMonth < finalMonth; currentMonth++)
        {
            dateSearchString += "&refine.entrydate=" + startYear + slash + currentMonth;
        }

        // Handle years between start and end year
        for (currentYear = startYear + 1; currentYear < endYear; currentYear++)
        {
            dateSearchString += "&refine.entrydate=" + currentYear;
        }

        // Handle first months in the final year
        if (!isDone)
        {
            for (currentMonth = 1; currentMonth < endMonth; currentMonth++)
            {
                dateSearchString += "&refine.entrydate=" + endYear + slash + currentMonth;
            }
        }				

        // Handle days in the final month
        for (currentDay = 1; currentDay <= endDay; currentDay++)
        {
            dateSearchString += "&refine.entrydate=" + endYear + slash + endMonth + slash + currentDay;
        }
    }

    dateSearchString += "&disjunctive.entrydate=true";

    return dateSearchString;
}


// Get the URL of the parking ticket database to search, based on the user's choice
function GetSelectedParkingTicketDBURL()
{			
    var targetDBRadios = document.getElementsByName('targetDB');
    for (i = 0; i < targetDBRadios.length; i++)
    {
        if (targetDBRadios[i].checked)
        {
            return parkingTicketDBURLs[i];
        }
    }
}


// Get the index of the selected parking ticket database
// Returns 0, 1, 2, for the 2010-2013, 2014-2016, 2017-2019 databases respectively
function GetSelectedParkingTicketDBIndex()
{			
    var targetDBRadios = document.getElementsByName('targetDB');
    for (i = 0; i < targetDBRadios.length; i++)
    {
        if (targetDBRadios[i].checked)
        {
            return i;
        }
    }
}


// Handler for interactions with the parking ticket database radio buttons
// radioIndex = [0,1,2], depening on which button was toggled
function HandleParkingTicketRadioToggle(radioIndex)
{
    var newMinDate;
    var newMaxDate;
    switch(radioIndex)
    {
        case 0:
            newMinDate = '2011-01-01';
            newMaxDate = '2013-12-31';
        break;
        
        case 1:
            newMinDate = '2014-01-01';
            newMaxDate = '2016-12-31';
        break;

        case 2:
            newMinDate = '2017-01-01';

            // Future proofing:
            if (moment().year() > 2019)
            {
                
                newMaxDate = '2019-12-31';
            }
            else
            {
                newMaxDate = moment().subtract(1, 'days');
            }
            
        break;
    }

    datePicker = new Lightpick
    (
        { 
            field			: document.getElementById('datepicker'),
            singleDate 		: false,
            hideOnBodyClick : true,
            numberOfMonths 	: 4,	// "Seasons" ?
            numberOfColumns	: 4,
            minDate			: newMinDate,
            maxDate			: newMaxDate,
            footer			: true,
            onClose			: DatePickerOnClose
        }
    );

    // Always choose the first week of the year by default:
    datePicker.setDateRange(moment(newMinDate), moment(newMinDate).add(6, 'days'));			// Set range for 1st + 6 = 7 days of the year

    datePicker.hide();

    _dateHasChanged = true;
}


// Event handler: Handle closing of the date picker
function DatePickerOnClose()
{
    _dateHasChanged = true;
}


// Helper function: Formats a name string consistently
// currentStreetName == a street name, with no block number prefix
function CleanseStreetNameString(currentStreetName)
{
    currentStreetName = currentStreetName.replace(/\./g, "").toUpperCase();	// Remove periods in street centerline names

    // Correct street type suffixes:
    currentStreetName = currentStreetName.replace(/( AV)$/, " AVE");
    currentStreetName = currentStreetName.replace(/( DRIVE)$/, " DR");

    // Move any N/E/S/W characters from the start of the street name to the end:
    if (currentStreetName.match(/^(N\s)/))
    {
        currentStreetName = currentStreetName.replace(/^(N\s)/, "");
        currentStreetName += " N";
    }
    if (currentStreetName.match(/^(E\s)/))
    {
        currentStreetName = currentStreetName.replace(/^(E\s)/, "");
        currentStreetName += " E";
    }
    if (currentStreetName.match(/^(S\s)/))
    {
        currentStreetName = currentStreetName.replace(/^(S\s)/, "");
        currentStreetName += " S";
    }
    if (currentStreetName.match(/^(W\s)/))
    {
        currentStreetName = currentStreetName.replace(/^(W\s)/, "");
        currentStreetName += " W";
    }

    // Special cases:
    if (currentStreetName.match(/^(NW\s)/))
    {
        currentStreetName = currentStreetName.replace(/^(NW\s)/, "");
        currentStreetName += " NW";
    }

    return currentStreetName;
}


// Helper function: Extracts a "simple" name from a pre-cleansed name string
function GetSimpleStreetName(currentStreetName)
{
    var nameParts = currentStreetName.split(" ");
    var simpleName = nameParts[0];	// Eg. "Trounce Alley" -> "Trounce". "4th Ave W" -> "4th"

    if (nameParts.length > 3)
    {
        simpleName = nameParts[0] + " " + nameParts[1];
    }

    // Handle special cases:
    if (simpleName == "ST" || simpleName == "THE")
    {
        simpleName += " " + nameParts[1];
    }

    return simpleName;
}


// Helper function: Formats a nice name string suitable for display (ie. Capitalizes Every Word In The Sentence)
function FormatNiceNameString(rawName)
{
    var result = "";
    var nameParts = rawName.toLowerCase().split(" ");
    for (var i = 0; i < nameParts.length; i++)
    {
        if (i != 0)
        {
            result += " ";
        }
        var currentWord = nameParts[i].charAt(0).toUpperCase() + nameParts[i].substr(1); // From index 1 to the end
        result += currentWord;
    }

    return result;
}


// Helper function: Reads the current date from the date picker, and assembles it into a pretty string for display
function GetPrettyDateString()
{
    var dateParts 	= datePicker.toString('YYYY-MM-DD').split('-');

    var firstDate 	= dateParts[0] + "-" + dateParts[1] + "-" + dateParts[2];
    firstDate 		= moment(firstDate, 'YYYY-MM-DD').format('DD MMM YYYY');

    var secondDate = "";
    if (parseInt(dateParts[0]) != parseInt(dateParts[3]) || parseInt(dateParts[1]) != parseInt(dateParts[4]) || parseInt(dateParts[2]) != parseInt(dateParts[5]))
    {
        secondDate = dateParts[3] + "-" + dateParts[4] + "-" + dateParts[5];
        secondDate = " - " + moment(secondDate, 'YYYY-MM-DD').format('DD MMM YYYY');
    }

    return firstDate + secondDate;
}


// Helper function: Formats a number into a comm-seperated string
function GetPrettyNumberString(number)
{
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


// Assemble a formatted dictionary of street centerlines and parking ticket data
// NOTE: If targetStreet == "", all visible streets will be indexed
async function AssembleResultsDict(targetStreet)
{
    // Enable the on-screen loading icon
    theMap.spin(true);

    // Get the visible street centerlines:
    var streetCenters = await GetStreetLatLngs(targetStreet, GetBoundsAsSearchString());			
    if (streetCenters.records.length == 0)
    {
        window.alert("Search returned 0 results");
        theMap.spin(false);
        return;
    }

    if (streetCenters.nhits > MAX_SEARCH_ROWS)
    {
        window.alert("The current search has returned " + streetCenters.nhits + " street records, greater than the max of " + MAX_SEARCH_ROWS + ". Some data has been lost, try searching a smaller area.");
    }

    var streetNames = []; // Used for building parking ticket DB query string
    for (i = 0; i < streetCenters.records.length; i++)
    {
        // Get the streetname and block number
        var currentBlock;
        var currentStreetName; 		// (eg. "CARRALL ST")
        var isDoubleBlock = false;	// Is this multiple blocks in 1 record? (Eg. 3900-4000 GRANVILLE ST)
        var secondBlockNumber = -1;	// Used to hold the second block number, if we need to create duplicate records
        if (/\d/.test(streetCenters.records[i].fields.hblock))
        {
            currentBlock 		= streetCenters.records[i].fields.hblock.split(" ")[0]; // First element is the street number: 100, 800-900 etc
            if (/(-)/.test(currentBlock)) // Check for double blocks (eg. 800-900)
            {
                blockNums 			= currentBlock.split("-");
                currentBlock 		= blockNums[0];
                secondBlockNumber 	= blockNums[1];
                isDoubleBlock 		= true;
            }

            currentStreetName 	= streetCenters.records[i].fields.hblock.substr( streetCenters.records[i].fields.hblock.indexOf(" ") + 1, streetCenters.records[i].fields.hblock.length);
        }
        else // Street name does not contain a number (eg. "Granville Bridge")
        {
            currentBlock		= streetCenters.records[i].fields.hblock;
            currentStreetName	= streetCenters.records[i].fields.hblock;
        }

        currentStreetName = CleanseStreetNameString(currentStreetName);
        
        var simpleName = GetSimpleStreetName(currentStreetName);
        
        var fullName = FormatNiceNameString(currentStreetName);

        currentStreetName = simpleName;

        // Insert a street if it's not already in our results dictionary:
        if (!assembledResults.streetResults[currentStreetName])
        {					
            assembledResults.streetResults[currentStreetName] = 
            {
                block 		: {}
            };

            // Store the nicely formatted name:
            assembledResults.streetResults[currentStreetName].fullName = fullName;
        }

        // Add it to our list of (unique) street names, so we can query the parking ticket DB later
        if (!streetNames.includes(simpleName))
        {
            streetNames.push(simpleName);
        }
        
        if (!assembledResults.streetResults[currentStreetName].block[currentBlock])
        {				
            assembledResults.streetResults[currentStreetName].block[currentBlock] =
            {
                latLngs 			: [],	// LatLngs for drawing street centerlines
                midPoint			: null,	// Single, averaged latLng point for the middle of a block
                infractions 		: [],	// Array of tickets for the current block
                alreadyProcessed 	: false,	// Flag: Is this entry new, or did it already exist? 
            }
        }

        // Assemble the coordinates in the correct format. NOTE: We need to reverse the lat/lng coordinates
        var latLngs = [];
        for (j = 0; j < streetCenters.records[i].fields.geom.coordinates.length; j++)
        {
            latLngs = latLngs.concat( 
                [
                    [ streetCenters.records[i].fields.geom.coordinates[j][1], streetCenters.records[i].fields.geom.coordinates[j][0] ] // Need to reverse the order, for some reason
                ]
            );
        }

        if (assembledResults.streetResults[currentStreetName].block[currentBlock].alreadyProcessed == false)
        {
            assembledResults.streetResults[currentStreetName].block[currentBlock].latLngs.push(latLngs); // Push as nested arrays, to handle edge cases where streets aren't divided by block # (eg. bridges, which only have 1 "block")
        }
        else
        {
            var matchingLatLngs = [];
            for (currentLatLng = 0; currentLatLng < latLngs.length; currentLatLng++) 
            {
                matchingLatLngs[currentLatLng] = false;

                for (existingLatLngArr = 0; existingLatLngArr < assembledResults.streetResults[currentStreetName].block[currentBlock].latLngs.length; existingLatLngArr++)
                {
                    for (existingLatLng = 0; existingLatLng < assembledResults.streetResults[currentStreetName].block[currentBlock].latLngs[existingLatLngArr].length; existingLatLng++)
                    {
                        if
                        (
                            latLngs[currentLatLng][0] == assembledResults.streetResults[currentStreetName].block[currentBlock].latLngs[existingLatLngArr][existingLatLng][0] &&
                            latLngs[currentLatLng][1] == assembledResults.streetResults[currentStreetName].block[currentBlock].latLngs[existingLatLngArr][existingLatLng][1]
                        )
                        {
                            matchingLatLngs[currentLatLng] = true;
                            break;
                        }
                    }
                    if (matchingLatLngs[currentLatLng] == true)
                    {
                        break;
                    }
                }

                if (matchingLatLngs[currentLatLng] == false)
                {
                    assembledResults.streetResults[currentStreetName].block[currentBlock].latLngs.push(latLngs); // Push as nested arrays, to handle edge cases where streets aren't divided by block # (eg. bridges, which only have 1 "block")
                    // console.log("length af: " + assembledResults.streetResults[currentStreetName].block[currentBlock].latLngs.length);
                    break;
                }

            }
            
        } // End existing latLng check

        // Now that we've created a full record, make copies of any missing blocks between our double blocks:
        if (isDoubleBlock)
        {
            var missingBlockNum = secondBlockNumber;
            while(missingBlockNum > currentBlock) // Fill in missing blocks in units of 100
            {
                // FIX: Force a "deep" copy by converting to/from JSON. TODO: Handle this more efficiently
                assembledResults.streetResults[currentStreetName].block[missingBlockNum] = JSON.parse( JSON.stringify( assembledResults.streetResults[currentStreetName].block[currentBlock] ) ); 

                missingBlockNum -= 100;
            }
        }
    }

    // Compute the midpoints of each block's centerline:
    ComputeLatLngMidpoints(assembledResults.streetResults);		

    // Get the associated parking ticket data for the current block. 
    var tickeResults = await QueryParkingTicketDB(streetNames, GetSelectedParkingTicketDBURL()); // TEMPORARILY omit the status filters, for now...

    if (tickeResults.nhits > MAX_SEARCH_ROWS)
    {
        window.alert("The current search has returned " + tickeResults.nhits + " parking ticket records, greater than the max of " + MAX_SEARCH_ROWS + ". Some data has been lost, try searching a smaller area or date range.");
    }
    
    var debugMissedStreetEntries = 0;
    var debugMissedBlockEntries = 0;

    // Add parking ticket data to our results dictionary:
    for (i = 0; i < tickeResults.records.length; i++)
    {
        var streetNameKey = CleanseStreetNameString(tickeResults.records[i].fields.street);

        streetNameKey = GetSimpleStreetName(streetNameKey);		

        if (assembledResults.streetResults[streetNameKey])
        {
            if (assembledResults.streetResults[streetNameKey].block[tickeResults.records[i].fields.block])
            {
                // Check: Has this infraction already been added?
                var containsID = false;
                for (currentInfraction = 0; currentInfraction < assembledResults.streetResults[streetNameKey].block[tickeResults.records[i].fields.block].infractions.length; currentInfraction++)
                {
                    if (assembledResults.streetResults[streetNameKey].block[tickeResults.records[i].fields.block].infractions[currentInfraction].id == tickeResults.records[i].recordid)
                    {
                        containsID = true;
                        break;
                    }
                }
                // If not, add it:
                if (!containsID)
                {
                    assembledResults.streetResults[streetNameKey].block[tickeResults.records[i].fields.block].infractions.push
                    (
                        {
                            bylaw 			: tickeResults.records[i].fields.bylaw,
                            infractiontext	: tickeResults.records[i].fields.infractiontext,
                            section			: tickeResults.records[i].fields.section,
                            status 			: tickeResults.records[i].fields.status,
                            
                            year			: tickeResults.records[i].fields.year,
                            month			: tickeResults.records[i].fields.entrydate.split("-")[1],
                            day				: tickeResults.records[i].fields.entrydate.split("-")[2],
                            weekday			: moment(tickeResults.records[i].fields.entrydate).day(),	// 0 = Sunday, 1 = Monday, ..., 6 = Saturday

                            id				: tickeResults.records[i].recordid,	// Use the identifier rather than hashing our own
                        }
                    );
                }
            }
            // DEBUG:
            else
            {
                debugMissedBlockEntries++;
            }
        }
        // DEBUG:
        else
        {
            debugMissedStreetEntries++;
        }
    }

    // Trigger stats computations:
    ComputeAssembledResultsStats();

    // Disable the on-screen loading icon
    theMap.spin(false);
}


// Helper function: Computes stats for the data contained in assembledResults
function ComputeAssembledResultsStats()
{
    InitializeStats();

    // Compute stats:
    for (var currentStreet in assembledResults.streetResults)
    {
        var streetTotal = 0;
        for (var currentBlock in assembledResults.streetResults[currentStreet].block)
        {
            // Total infractions
            assembledResults.stats.totalInfractions += assembledResults.streetResults[currentStreet].block[currentBlock].infractions.length;

            // Per-street infractions:
            streetTotal += assembledResults.streetResults[currentStreet].block[currentBlock].infractions.length;

            // Max infraction for a single block:
            if (assembledResults.streetResults[currentStreet].block[currentBlock].infractions.length > assembledResults.stats.maximums.block.count)
            {
                assembledResults.stats.maximums.block.count 		= assembledResults.streetResults[currentStreet].block[currentBlock].infractions.length;
                assembledResults.stats.maximums.block.streetName 	= currentStreet;
                assembledResults.stats.maximums.block.blockNumber 	= currentBlock;
            }

            // Per-infraction stats:
            for (var currentInfraction = 0; currentInfraction < assembledResults.streetResults[currentStreet].block[currentBlock].infractions.length; currentInfraction++)
            {
                var currentWeekday 	= assembledResults.streetResults[currentStreet].block[currentBlock].infractions[currentInfraction].weekday;
                var currentBylaw 	= assembledResults.streetResults[currentStreet].block[currentBlock].infractions[currentInfraction].bylaw;

                assembledResults.stats.weekdayTotals[currentWeekday]++;
                assembledResults.stats.bylawTotals[currentBylaw]++;
                assembledResults.stats.statusTotals[assembledResults.streetResults[currentStreet].block[currentBlock].infractions[currentInfraction].status]++;

                assembledResults.stats.weekdayBylawTotals[currentWeekday][currentBylaw]++;
            }
            
            // Add debug stats:
            for (latLngArr = 0; latLngArr < assembledResults.streetResults[currentStreet].block[currentBlock].latLngs.length; latLngArr++)
            {
                assembledResults.stats.numLatLngs += assembledResults.streetResults[currentStreet].block[currentBlock].latLngs[latLngArr].length;
            }
            

            // Set the processed flag
            assembledResults.streetResults[currentStreet].block[currentBlock].alreadyProcessed = true;
        }

        // Update per-street infraction maximums:
        if (streetTotal > assembledResults.stats.maximums.street.count)
        {
            assembledResults.stats.maximums.street.count 		= streetTotal;
            assembledResults.stats.maximums.street.streetName 	= currentStreet;
        }
        
    }
}


// Get a list of parking ticket records matching an ARRAY of street names
// Note: This data is not georestricted, it simply returns all results for a given street name
async function QueryParkingTicketDB(streetNames, DBURL)
{
    var searchQuery 	= "&q=";
    for (i = 0; i < streetNames.length; i++)
    {
        searchQuery += "\"" + streetNames[i] + " \""; // Require an "exact match"
        
        if (i != streetNames.length - 1)
        {
            searchQuery += " OR ";	// NOTE: The OpenData DB also supports logical OR, AND, NOT (eg. query1 OR query2)
        }
    }			

    var searchRows 		= "&rows=" + MAX_SEARCH_ROWS;
    
    // Exclude drinking water bylaw tickets for the 21017-2019 DB:
    var bylawString = "";
    if (GetSelectedParkingTicketDBIndex() == 2)
    {
        var bylawString 	= "&exclude.bylaw=12086";
    }			

    var dateString 		= GetDateAsSearchString();
    
    var searchString 	= DBURL + searchQuery + searchRows + dateString + bylawString;
    
    const searchResults = await fetch(searchString);
    const streetCenters = await searchResults.json(); // Comes already parsed as an object

    return streetCenters;
}


// Get a JSON object containing all of the VISIBLE latlng points required to draw a line down a street.
// Note: If streetName == "", this function will return all VISIBLE streets
async function GetStreetLatLngs(streetName, searchBounds = "")
{
    var searchQuery;
    if (streetName != "")
    {
        searchQuery 	= "&q=\"" + streetName + "\""; // Require an "exact match"
        searchBounds 	= ""; 	// We don't want to restrict to the visible bounds if we're just querying 1 street
    }
    else
    {
        searchQuery = "";
    }
    
    var searchRows 		= "&rows=" + MAX_SEARCH_ROWS;
    
    var searchString 	= publicStreetsDBURL + searchQuery + searchRows + searchBounds;
    
    const searchResults = await fetch(searchString);
    const streetCenters = await searchResults.json(); // Comes already parsed as an object
    
    return streetCenters;
}


// Get a "&geofilter.polygon=" string for appending to a database query
function GetBoundsAsSearchString()
{				
    // Build a quad as 4 points of (lat,lng), expressed as a search string:
    var searchString 	= "&geofilter.polygon=";
    var comma 			= "%2C+"; // Used to seperate elements in our string
    
    // Assemble points (CCW):
    var botLeft 	= "(" + theMap.getBounds()._southWest.lat + comma + theMap.getBounds()._southWest.lng + ")";
    var botRight 	= "(" + theMap.getBounds()._southWest.lat + comma + theMap.getBounds()._northEast.lng + ")";
    var topRight 	= "(" + theMap.getBounds()._northEast.lat + comma + theMap.getBounds()._northEast.lng + ")";
    var topLeft 	= "(" + theMap.getBounds()._northEast.lat + comma + theMap.getBounds()._southWest.lng + ")";
    
    searchString += topLeft + comma + botLeft + comma + botRight + comma + topRight;
    
    return searchString;
}