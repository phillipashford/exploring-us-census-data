(function () {

    // Add footer and off-canvas element date
    setDate()

    // set global variables for header, map container, and footer
    const header = document.querySelector("header");
    const mapContainer = document.querySelector("#map");
    const footer = document.querySelector("footer");

    // set map height to fill window
    mapContainer.style.height =
        window.innerHeight - header.offsetHeight - footer.offsetHeight + "px";

    // initial Leaflet map options
    const options = {
        center: [39.9, -99.1],
        zoom: 5,
        zoomSnap: 0.5,
        zoomControl: false,
        attributionControl: false,
    };

    // create Leaflet map and apply options
    const map = L.map("map", options);

    // Add zoom control to map
    map.addControl(L.control.zoom({ position: "topright" }));

    // async keyword before function declaration
    // allows use of await with Promises
    async function getData() {

        // Make the call to get counties data
        const counties = await fetch("data/us_counties_2020_20m.geojson");
        // Code will pause here until the above Promise resolves 
        // and returns a response object

        // If response not ok, throw an error
        if (!counties.ok) {
            throw new Error(`HTTP error! status: ${counties.status}`);
            // execution of script ends here
        }

        // Make the call to get the response as JSON
        let data = await counties.json();
        // Code will pause here until the above Promise resolves

        // Store returned value (geojson feature layers) from the Leaflet geojson method call (with the data from our fetch passed in as an argument) 
        const dataLayer = L.geoJson(data, {
            style: function (feature) {
                return {
                    color: 'white',
                    weight: 0.5,
                    fillOpacity: 1,
                    fillColor: '#1f78b4'
                };
            }
        }).addTo(map)

        // Make call to update map
        drawMap(dataLayer);

        // Make the call to get state data
        const states = await fetch("data/us_states_20m.geojson");
        // Code will pause here until response is received

        if (!states.ok) {
            throw new Error(`HTTP error! status: ${states.status}`);
        }
        // Make the call to get the response as JSON
        data = await states.json();
        // Code will pause here until 'data' is available

        drawAnotherLayer(data);
    }

    // Call the function
    getData();

    function setDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.toLocaleString('default', { month: 'long' });
        const footerText = document.querySelector("footer p");
        footerText.innerHTML = `${month}, ${year} | Phillip Ashford`;
        const offCanvasDate = document.getElementById('off-canvas-date');
        offCanvasDate.innerHTML = `${month}, ${year}`;
    }

    function drawMap(dataLayer) {
        // Store returned 2 dimensional array of breaks value
        const breaks = getClassBreaks(dataLayer);

        // Loop through each layer of the Leaflet geoJSON layer
        dataLayer.eachLayer(function (layer) {
            // Store breadcrumbs to desired values
            const props = layer.feature.properties;

            // Set the style of each layer
            layer.setStyle({
                // Assign a fill color to each layer, equal to the returned value from getColor
                // () after passing 1 (the rent value) and 2 (the breaks array) as arguments
                fillColor: getColor(props["RENT"], breaks),
            });

            //Store dynamically generated HTML for each layer in toolTipInfo constant
            var toolTipInfo = `<h3>${props.NAME} County</h3>`
            if (props["RENT"] && props["RENT"] > 0) {
                toolTipInfo += `Median Rent: $${props["RENT"].toLocaleString()}<br>`;
            } else {
                toolTipInfo += `Data not available<br>`;
            }

            // Bind, as a tooltip, the current iteration of the toolTipInfo variable to the current layer, with options
            layer.bindTooltip(toolTipInfo, {
                sticky: true,
                className: "leaflet-tooltip-own",
            });
        });

        // Call drawLegend, passing 'breaks' array as argument
        drawLegend(breaks);
    }

    function drawAnotherLayer(data) {
        L.geoJson(data, {
            style: function (feature) {
                return {
                    color: "#fff",
                    // Make line weight larger than the county outline
                    weight: 1,
                    fillOpacity: 0,
                    interactive: false,
                };
            }
        }).addTo(map);
    }

    // This function uses the 'simple stats' script to generate and return a 
    // two-dimensional array containing the ranges of the breaks of the array 
    // which has been passed to the function as an argument.
    function getClassBreaks(dataLayer) {
        // create empty Array for storing values
        const values = [];

        // loop through all the geojson objects
        dataLayer.eachLayer(function (layer) {
            const props = layer.feature.properties;
            // Stores this layer's rent value in a constant
            const value = props["RENT"];
            // Conditional checks for valid value and if so, pushes each layer's rent value
            // to the 'values' array
            if (value && value > 0) {
                values.push(value);
            }
        });

        // Determine similar clusters using the 'simple stats' script. 'equalIntervalBreaks' 
        // also available > https://simplestatistics.org/docs/#equalintervalbreaks
        const clusters = ss.ckmeans(values, 5);

        // create an array of the lowest and highest value within each cluster (the breakpoints)
        const breaks = clusters.map(function (cluster) {
            return [cluster[0], cluster.pop()];
        });
        return breaks; // return Array of class breaks
    } // end getClassBreaks function

    // Function receives target value and array of breaks, uses conditional structure to determine value's color based on breaks ranges, and returns corresponding color.
    function getColor(d, breaks) {
        return d >= breaks[4][0] ? '#08519c' :
            d >= breaks[3][0] ? '#3182bd' :
                d >= breaks[2][0] ? '#6baed6' :
                    d >= breaks[1][0] ? '#bdd7e7' :
                        d >= breaks[0][0] ? '#eff3ff' :
                            '#D3D3D3'; // 'No data' color
    } // end getColor

    function drawLegend(breaks) {
        // create a new Leaflet control object, and position it top left
        const legend = L.control({ position: "topleft" });

        legend.onAdd = function () {
            // create a new HTML <div> element and give it a class list
            const div = L.DomUtil.create('div',
                'legend d-flex flex-column px-3 py-2');

            // Appends an <h3> tag holding the legend title to the div , as well as a div holding the 'no data' span and label.
            div.innerHTML = `<h3>Median Rent</h3>
          <div class="d-flex flex-row justify-content-start">
                <span style="background: #D3D3D3"></span>
                <label>No data</label>
            </div>`;

            // for each of our breaks
            for (let i = 0; i < breaks.length; i++) {
                // determine the color associated with each break value,
                // including the lower range value
                const color = getColor(breaks[i][0], breaks);
                // concatenate a <span> tag styled with the color and the range values
                // of that class and include a label with the low and a high ends of that class range
                div.innerHTML +=
                    `<div class="d-flex flex-row justify-content-start">
                <span style="background:${color}"></span>
                <label>$${(breaks[i][0]).toLocaleString()} &mdash; 
                $${(breaks[i][1]).toLocaleString()}</label>
            </div>`;
            }

            // return the populated div to be added to the map
            return div;
        };

        // add the legend to the map
        legend.addTo(map);
    }

})();
