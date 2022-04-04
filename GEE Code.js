
// Obtain OSM data from BBBike for the area of interest and import cleaned shapefiles into GEE
// Assign variables to each LULC class
var Commercial = ee.FeatureCollection("users/MburuE/KCommercial")
var Cropland = ee.FeatureCollection("users/MburuE/KCropland")
var Forest = ee.FeatureCollection("users/MburuE/KForest")
var Grassland = ee.FeatureCollection("users/MburuE/KGrassland")
var Industrial = ee.FeatureCollection("users/MburuE/KIndustrial")
var Residential = ee.FeatureCollection("users/MburuE/KResidential")
var Transport = ee.FeatureCollection("users/MburuE/KTransport")
var Waterbody = ee.FeatureCollection("users/MburuE/KWaterbody")

// Import area of interest shapefile and assign variable
var kiambu = ee.FeatureCollection("users/MburuE/Kiambu_County")

//Specify remotely sensed imagery 
var L8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_TOA")

//Display variable shapefiles 
// 1st Shapefile
Map.addLayer(Commercial);

// 2nd Shapefile
Map.addLayer(Cropland);

// 3rd Shapefile
Map.addLayer(Forest);

// 4th Shapefile
Map.addLayer(Grassland);

// 4th Shapefile
Map.addLayer(Industrial);

// 5th Shapefile
Map.addLayer(Industrial);

// 6th Shapefile
Map.addLayer(Residential);

// 7th Shapefile
Map.addLayer(Transport);

// 8th Shapefile
Map.addLayer(Waterbody);

// Bounding box for area of interest
var selection = L8.filterBounds(ee.Geometry.Polygon(
        [[[33.4513760387345, -0.5332958448514842],
          [33.4513760387345, -1.8486461148528205],
          [40.4401455699845, -1.8486461148528205],
          [40.4401455699845, -0.5332958448514842]]], null, false))
.filterDate("2018-01-01","2018-12-31")
.filterMetadata("CLOUD_COVER", "less_than", 1)
.mean(); 

// Add to map specified bands of Landsat 8 imagery
Map.addLayer(selection, {bands:["B4","B3","B2"]});

// Merge all LULC class shapefiles
var TrainingData = Commercial.merge(Cropland).merge(Forest).merge(Grassland).merge(Industrial).merge(Residential).merge(Transport).merge(Waterbody).randomColumn("random");
print(TrainingData, 'TrainingData')

// Randomly select 80% of the training data as test data and 20% as validation data
var trainingData = TrainingData.filter(ee.Filter.lt("random",0.8))
var testData = TrainingData.filter(ee.Filter.gt("random",0.2))

// Specify attribute for LULC classes 
var TrainingSample = selection.sampleRegions(trainingData,["class"],30);
var TestSample = selection.sampleRegions(testData,["class"],30);

var bandNames = selection.bandNames()

// Use random forest as a classifier algorthm
var classifier = ee.Classifier.smileRandomForest(10,10).train(TrainingSample,"class",bandNames);

// Classify the input imagery.
var classified = selection.classify(classifier);

// Display various classes by specified colors
Map.addLayer(classified, {min: 0, max: 3, palette: ['maroon', 'red', 'lime', 'green', 'pink', 'purple', 'orange', 'yellow']});

// Confusion Matrix
var confMatrix = classifier.confusionMatrix()

print(confMatrix)

var OA = confMatrix.accuracy()
var CA = confMatrix.consumersAccuracy()
var Kappa = confMatrix.kappa()
var Order = confMatrix.order()
var PA = confMatrix.producersAccuracy()

print(confMatrix,'Confusion Matrix')
print(OA,'Overall Accuracy')
print(CA,'Consumers Accuracy')
print(Kappa,'Kappa')
print(Order,'Order')
print(PA,'Producers Accuracy')

//Export the classification result
Export.image.toDrive({
  image: classified,
  description: "KiambuLUMap",
  folder: "EarthEngine",
  region: kiambu,
  scale: 20,
  maxPixels: 1e13
});
