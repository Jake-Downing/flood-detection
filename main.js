// area of interest
var aoi = ee.Geometry.Rectangle([100.2, 13.5, 100.9, 14.3]);
Map.centerObject(aoi, 8);
Map.setOptions('SATELLITE');

// start date slider
var startSlider = ui.DateSlider({
  start: '2020-01-01',
  end: '2025-01-01',
  value: '2024-12-01',
  period: 1,
  style: {stretch: 'horizontal'}
});

// get todays date
function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

var today = new Date();
var yyyy = today.getFullYear();
var mm = pad2(today.getMonth() + 1);
var dd = pad2(today.getDate());
var todayString = yyyy + '-' + mm + '-' + dd;

// end date slider
var endSlider = ui.DateSlider({
  start: '2020-01-01',
  end: todayString,
  value: todayString,
  period: 1,
  style: {stretch: 'horizontal'}
});

// flood threshold input
var thresholdBox = ui.Textbox({
  placeholder: 'Enter threshold (1–6)',
  value: '3'
});

// popular cities
var cities = {
  'Bangkok': ee.Geometry.Point([100.5018, 13.7563]),
  'Chiang Mai': ee.Geometry.Point([98.9925, 18.7877]),
  'Khon Kaen': ee.Geometry.Point([102.8350, 16.4419]),
  'Ayutthaya': ee.Geometry.Point([100.5770, 14.3532])
};

// city selector dropdown
var citySelect = ui.Select({
  items: Object.keys(cities),
  placeholder: 'Select a city...',
  onChange: function(city) {
    var point = cities[city];
    Map.centerObject(point, 9);
    setAOI(point);
  }
});

// refresh button
var refreshButton = ui.Button({
  label: 'Refresh',
  onClick: updateMap,
  style: {stretch: 'horizontal'}
});

// UI panel
var panel = ui.Panel({
  widgets: [
    ui.Label('Flood Date Range:'),
    ui.Label('Start Date:'), startSlider,
    ui.Label('End Date:'), endSlider,
    ui.Label('Choose a city:'), citySelect,
    ui.Label('Or click on the map to select location.'),
    ui.Label('Flood Threshold (1–6):'), thresholdBox,
    refreshButton
  ],
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '300px'}
});
ui.root.insert(0, panel);

// click on map to set AOI
function setAOI(point) {
  aoi = point.buffer(20000).bounds();
}

// map click event
Map.onClick(function(coords) {
  var point = ee.Geometry.Point(coords.lon, coords.lat);
  Map.centerObject(point, 9);
  setAOI(point);
});

// main function
function updateMap() {
  Map.layers().reset();

  var start = ee.Date(startSlider.getValue()[0]);
  var end = ee.Date(endSlider.getValue()[0]);

  var threshold = parseFloat(thresholdBox.getValue());
  if (isNaN(threshold)) threshold = 3;
  threshold = ee.Number(threshold).clamp(1, 6);

  var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
    .select('VV')
    .sort('system:time_start');

  s1.size().evaluate(function(n) {
    print('Image count:', n);

    if (n === 0) {
      print('No Sentinel-1 images found for this range.');
      return;
    }

    var min = s1.min();
    var med = s1.median();
    var diff = med.subtract(min);
    var flood = diff.gt(threshold);

    Map.addLayer(diff.clip(aoi), {min: -2, max: 2}, 'Backscatter Drop');
    Map.addLayer(flood.updateMask(flood).clip(aoi), {palette: 'blue'}, 'Flooded Areas');
  });
}

// optional initial update
updateMap();
