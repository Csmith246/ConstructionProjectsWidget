
define([
  'dojo/_base/declare',
  'jimu/BaseWidget',
  'esri/tasks/QueryTask',
  'esri/tasks/query',
  'esri/graphic',
  'esri/layers/GraphicsLayer',
  'esri/symbols/SimpleLineSymbol',
  'esri/Color'
],
  function (declare, BaseWidget, QueryTask, Query, Graphic, GraphicsLayer, SimpleLineSymbol, Color) {
    return declare([BaseWidget], {

      baseClass: 'construction-projects-widget',

      countiesLyr: 'https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Civil_Boundaries/FeatureServer/2',
      constructionProjectsLyr: 'https://gis3.dot.ny.gov/arcgis/rest/services/ActiveProjects/MapServer/0',

      currCountyGraphicsLyr: null, // graphics layer which represents the current county 

      // add additional properties here

      // methods to communication with app container:
      postCreate: function () {
        this.inherited(arguments);
        console.log('ConstructionProjectsWidget::postCreate');
      },

      onReceiveData: function (name, widgetId, data) {
        console.log("OUTPUT:::", name, widgetId, data);
        if (name === "Search" && data["selectResult"]) {
          console.log("IN IF BRANCH");
          let countyData = this._getCountyWithin(data.selectResult.result.feature.geometry);
          countyData.then(result => {
            console.log(result);
            let countyGeometry = result.features["0"].geometry;
            // Assign county name to RESULTS BOX display here
            this._outlineCounty(countyGeometry);
            let projectsData = this._getProjectsByCounty(countyGeometry);
            console.log("on the way to projects for the county");
            projectsData.then(projectsInCounty => {
              console.log(projectsInCounty);
            }, err => {
              console.log("error,", err);
            });

          }, err => {
            console.log("error,", err);
          });
        }
      },

      _getCountyWithin: function (geometry) {
        var queryTask = new QueryTask(this.countiesLyr);

        var query = new Query();
        query.geometry = geometry;
        query.spatialRelationship = Query.SPATIAL_REL_WITHIN;
        query.returnGeometry = true;

        return queryTask.execute(query);
      },

      _outlineCounty: function (countyGeometry) {
        if(this.currCountyGraphicsLyr){
          this.map.removeLayer(this.currCountyGraphicsLyr);
        }
        let outline = new SimpleLineSymbol();
        outline.setColor(new Color([255, 255, 0, 1]));
        outline.setWidth(5.75);
        let countyGraphic = new Graphic(countyGeometry, outline);

        let graphicslayer = new GraphicsLayer();
        graphicslayer.add(countyGraphic);
        this.currCountyGraphicsLyr = graphicslayer;
        this.map.addLayer(graphicslayer);
        console.log("graphic added");
      },

      _getProjectsByCounty(countyGeometry){
        var queryTask = new QueryTask(this.constructionProjectsLyr);

        var query = new Query();
        query.geometry = countyGeometry;
        query.spatialRelationship = Query.SPATIAL_REL_CONTAINS;
        query.returnGeometry = true;

        return queryTask.execute(query);
      }
      // startup() {
      //   this.inherited(arguments);
      //   console.log('ConstructionProjectsWidget::startup');
      // },
      // onOpen() {
      //   console.log('ConstructionProjectsWidget::onOpen');
      // },
      // onClose(){
      //   console.log('ConstructionProjectsWidget::onClose');
      // },
      // onMinimize(){
      //   console.log('ConstructionProjectsWidget::onMinimize');
      // },
      // onMaximize(){
      //   console.log('ConstructionProjectsWidget::onMaximize');
      // },
      // onSignIn(credential){
      //   console.log('ConstructionProjectsWidget::onSignIn', credential);
      // },
      // onSignOut(){
      //   console.log('ConstructionProjectsWidget::onSignOut');
      // }
      // onPositionChange(){
      //   console.log('ConstructionProjectsWidget::onPositionChange');
      // },
      // resize(){
      //   console.log('ConstructionProjectsWidget::resize');
      // }
    });

  });