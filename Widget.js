
define([
  'dojo/_base/declare',
  'jimu/BaseWidget',
  'esri/tasks/QueryTask',
  'esri/tasks/query',
  'esri/graphic',
  'esri/layers/GraphicsLayer',
  'esri/symbols/SimpleLineSymbol',
  'esri/Color',
  'esri/config',
  'esri/geometry/geometryEngine',
  'dojo/dom',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/dom-style'
],
  function (declare, BaseWidget, QueryTask, Query, Graphic, GraphicsLayer, SimpleLineSymbol, Color, esriConfig, geoEngine,
    dom, domConstruct, on, domStyle) {
    return declare([BaseWidget], {

      baseClass: 'construction-projects-widget',

      countiesLyr: 'https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Civil_Boundaries/FeatureServer/2',
      constructionProjectsLyr: 'https://gistest3.dot.ny.gov/arcgis/rest/services/ActiveProjects/MapServer/0',

      currCountyGraphicsLyr: null, // graphics layer which represents the current county 

      postCreate: function () {
        this.inherited(arguments);

        // esriConfig.defaults.io.proxyUrl = "http://localhost/proxy.php"
        // esriConfig.defaults.io.alwaysUseProxy = false;

        console.log('ConstructionProjectsWidget::postCreate');
      },

      onReceiveData: function (name, widgetId, data) {
        console.log("OUTPUT:::", name, widgetId, data);
        if (name === "Search" && data["selectResult"]) {
          let countyDeferred = this._getCountyThatPointIsIn(data.selectResult.result.feature.geometry);
          countyDeferred.then(result => {
            // Update Ui
            this._toggleResultsDisplay("showList");
            let countyGeometry = result.features["0"].geometry;
            this.currentCounty.innerHTML = result.features["0"].attributes.NAME; // Display County in UI
            this._outlineCounty(countyGeometry);

            // Use county geom to find projects
            let projDataForCountyDeferred = this._getProjectsByCounty(countyGeometry);
            projDataForCountyDeferred.then(projectsInCounty => {
              this._displayProjects(projectsInCounty.features);
            }, err => {
              console.log("Error getting Project information: ", err);
            });

          }, err => {
            console.log("Error getting County information: ", err);
          });
        }
      },

      _getCountyThatPointIsIn: function (pointGeometry) {
        var queryTask = new QueryTask(this.countiesLyr);

        var query = new Query();
        query.geometry = pointGeometry;
        query.spatialRelationship = Query.SPATIAL_REL_WITHIN;
        query.returnGeometry = true;

        return queryTask.execute(query);
      },

      _outlineCounty: function (countyGeometry) {
        if (this.currCountyGraphicsLyr) {
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
        console.log("outline graphic added");
      },

      _getProjectsByCounty(countyGeometry) { // REFACTOR to include queries to all Project types, then return All Promises
        var queryTask = new QueryTask(this.constructionProjectsLyr);

        var query = new Query();
        query.geometry = geoEngine.generalize(countyGeometry, 10000, true, "feet");
        query.spatialRelationship = Query.SPATIAL_REL_CONTAINS;
        query.returnGeometry = true;
        query.where = "1=1";
        query.outFields = ["*"];

        return queryTask.execute(query);
      },


      _toggleResultsDisplay(newCase) {
        let list = dom.byId("content-list");
        let defaultMsg = dom.byId("default-message");
        switch(newCase) {
          case "showList":
            domStyle.set(list, "display", "block");
            domStyle.set(defaultMsg, "display", "none");
        }
      },


      _displayProjects(projects) {
        let mainList = domConstruct.create("div", {
          className: "resultsList"
        }, this.resultsDisplay); //data dojo attach point

        let mainColFlex = domConstruct.create("div", {
          className: "resultsListFlex"
        }, mainList);

        for (let x = 0; x < projects.length; x++) {
          this._constructResultItem(projects[x], mainColFlex);
        }
      },


      _constructResultItem(projectItem, mainColumnArea) {
        // Zoom and Popup Handled here

        divElem = domConstruct.create("div", {className: "flexRow resultListFormat"}, mainColumnArea);

        domConstruct.create("p", {
          className: "resultItemText",
          innerHTML: projectItem.attributes.TITLE
        }, divElem);

        let zoomButton = domConstruct.create("button", {
          className: "zoomBtn",
          innerHTML: "<img width='14px' height='20px' src='./widgets/ConstructionProjectsWidget/images/zoomTo.png' />"
        }, divElem);

        on(zoomButton, "click", this.zoomAndSimulateClick.bind(this, null, projectItem.geometry));
      },


      zoomAndSimulateClick(evt, destPoint) {

        this.map.infoWindow.hide();

        this.map.centerAt(destPoint).then(function(destPoint){
          // Simulate click on map to bring up pop-up
          var centerOfScreen = this.map.toScreen(destPoint);
          this.map.onClick({
            mapPoint: destPoint,
            screenPoint: centerOfScreen
          });
        }.bind(this, destPoint));
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