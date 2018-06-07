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
      viewMapChanger: null, // event listner for map change
      deferredInProgress: null, // the deferred that is in progress


      postCreate: function () {
        this.inherited(arguments);

        // esriConfig.defaults.io.proxyUrl = "http://localhost/proxy.php"
        // esriConfig.defaults.io.alwaysUseProxy = false;
        console.log('ConstructionProjectsWidget::postCreate');

        //this._changeResultsDisplay("showDefault");
      },


      handleDisplayByChange() {
        console.log("IN SELECTBOX CHG");
        switch (this.displayBy.value) {
          case "county":
            this.unsetViewResults();
            this.resetDisplayToDefault();
            break;
          case "view":
            this.resetDisplayToDefault();
            this._changeResultsDisplay("showViewList");
            this.showProjectsByViewExtent();
            break;
          default:
            console.log("In default for handleDisplayByChange");
        }
      },


      setUpViewResults() {
        this.showProjectsByViewExtent();
        this.viewMapChanger = on(this.map, "update-end", this.showProjectsByViewExtent.bind(this));
      },


      unsetViewResults() {
        if(this.autoRefreshCheckBox.checked){
          this.autoRefreshCheckBox.checked = false;
        }
        if (this.viewMapChanger) {
          this.viewMapChanger.remove();
          this.viewMapChanger = null;
        }
      },


      toggleAutoRefresh(){
        console.log(this.autoRefreshCheckBox.checked);
        if(this.autoRefreshCheckBox.checked){
          this.setUpViewResults();
        }else{
          this.unsetViewResults();
        }
      },


      showProjectsByViewExtent() {
        console.log("In thingy");
        if (this.deferredInProgress) {
          console.log("In cancel");
          this.deferredInProgress.cancel("Not fast ENough");
        }
        let deferred = this.getProjectsByExtent();
        this.deferredInProgress = deferred;
        deferred.then(res => {
          this.deferredInProgress = null;
          console.log(res);
          this._clearViewResultsList();
          this._displayProjects(res.features, this.viewDisplay);
        });
      },


      getProjectsByExtent() {
        var queryTask = new QueryTask(this.constructionProjectsLyr);

        var query = new Query();
        query.geometry = this.map.extent;
        query.spatialRelationship = Query.SPATIAL_REL_CONTAINS;
        query.returnGeometry = true;
        query.where = "1=1";
        query.outFields = ["*"];

        return queryTask.execute(query);
      },


      // fires when search is performed in search box
      onReceiveData: function (name, widgetId, data) {
        console.log("OUTPUT:::", name, widgetId, data);
        if (name === "Search" && data["selectResult"] && this.displayBy.value === "county") {
          let countyDeferred = this._getCountyThatPointIsIn(data.selectResult.result.feature.geometry);
          countyDeferred.then(result => {
            // Update Ui
            this._changeResultsDisplay("showSearchList");
            let countyGeometry = result.features["0"].geometry;
            this.currentCounty.innerHTML = result.features["0"].attributes.NAME; // Display County in UI
            this._outlineCounty(countyGeometry);

            // Use county geom to find projects
            let projDataForCountyDeferred = this._getProjectsByCounty(countyGeometry);
            projDataForCountyDeferred.then(projectsInCounty => {
              //Get rid of old search results
              this._clearSearchResultsList();
              //populate new search results
              this._displayProjects(projectsInCounty.features, this.resultsDisplay); //data dojo attach point
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
        this._removeCountyOutline();
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


      _changeResultsDisplay(newCase) {
        let searchList = dom.byId("search-content-list");
        let defaultMsg = dom.byId("default-message");
        let viewList = dom.byId("view-content-list");
        switch (newCase) {
          case "showSearchList":
            domStyle.set(searchList, "display", "block");
            domStyle.set(defaultMsg, "display", "none");
            domStyle.set(viewList, "display", "none");
            break;
          case "showViewList":
            domStyle.set(searchList, "display", "none");
            domStyle.set(defaultMsg, "display", "none");
            domStyle.set(viewList, "display", "block");
            break;
          case "showDefault":
            domStyle.set(searchList, "display", "none");
            domStyle.set(defaultMsg, "display", "block");
            domStyle.set(viewList, "display", "none");
            break;
          default:
            console.log("In Default of switch statement... Yo.");
            break;
        }
      },


      _displayProjects(projects, domRoot) {
        let mainList = domConstruct.create("div", {
          className: "resultsList"
        }, domRoot);

        let mainColFlex = domConstruct.create("div", {
          className: "resultsListFlex"
        }, mainList);

        for (let x = 0; x < projects.length; x++) {
          this._constructResultItem(projects[x], mainColFlex);
        }
      },


      _constructResultItem(projectItem, mainColumnArea) {
        rowElem = domConstruct.create("div", { className: "flexRow resultListFormat" }, mainColumnArea);

        domConstruct.create("p", {
          className: "resultItemText",
          innerHTML: projectItem.attributes.TITLE
        }, rowElem);

        let zoomButton = domConstruct.create("button", {
          className: "zoomBtn",
          innerHTML: "<img width='14px' height='20px' src='./widgets/ConstructionProjectsWidget/images/zoomTo.png' />"
        }, rowElem);

        on(rowElem, "click", this.pointZoomAndSimulateClick.bind(this, null, projectItem.geometry));
      },


      _clearSearchResultsList() {
        domConstruct.empty(this.resultsDisplay);
      },

      _clearViewResultsList() {
        domConstruct.empty(this.viewDisplay);
      },


      _removeCountyOutline() {
        if (this.currCountyGraphicsLyr) {
          this.map.removeLayer(this.currCountyGraphicsLyr);
        }
        this.currCountyGraphicsLyr = null;
      },


      resetDisplayToDefault() {
        this._clearSearchResultsList();
        this._changeResultsDisplay("showDefault");
        this._removeCountyOutline();
      },


      zoomToCounty() {
        this.map.setExtent(this.currCountyGraphicsLyr.graphics["0"]._extent);
      },


      pointZoomAndSimulateClick(evt, destPoint) {

        this.map.infoWindow.hide();

        this.map.centerAt(destPoint).then(function (destPoint) {
          // Simulate click on map to bring up pop-up
          var centerOfScreen = this.map.toScreen(destPoint);
          this.map.onClick({
            mapPoint: destPoint,
            screenPoint: centerOfScreen
          });
        }.bind(this, destPoint));
      }

    });

  });