var fs = require('fs');
var path = require('path');
var request = require('request');
var _ = require('highland');

var columns = ['uuid', 'bestandsnaam', 'achternaam', 'voornaam', 'tussenvoegsel', 'patroniem', 'geboortedatum',  'geboorteplaats', 'beroep', 'annotatie', 'archiefnummer', 'archiefnaam', 'inventarisnummer', 'datum document', 'periode', 'deel', 'toegang', 'pagina', 'koppelcode', 'plaats', 'straat'];

var data = {
  street: require('./data/streets.json'),
  place: require('./data/places.json'),
  streetFailed: require('./data/streets-failed.json'),
  placeFailed: require('./data/places-failed.json'),
  br: require('./data/br.json')
};

function createQueries(row) {
  var queries = [];

  if (row.geboorteplaats) {
    queries.push({
      type: 'place',
      query: row.geboorteplaats,
      data: row
    });
  }

  if (row.straat) {
    var streets = row.straat
      .split('/')
      .map(function(street) {
        return {
          type: 'street',
          query: street.trim(),
          data: row
        };
      });

    queries = queries.concat(streets);
  }
  return _(queries);
}

function geocodeQuery(query, callback) {
  var queryString = query.query.toLowerCase().replace('(', ' ').replace(')', ' ').trim();

  if (query.type === 'street') {
    queryString += ',nijmegen&type=hg:Street';

    if (!data.br[query.query]) {
      data.br[query.query] = [];
    }

    data.br[query.query].push(query.data);

  } else {
    queryString += '&type=hg:Place';
  }

  if (data[query.type][query.query]) {
    query.geojson = data[query.type][query.query];
    callback(null, query);
  } else if (data[query.type + 'Failed'][query.query]) {
    query.geojson = null;
    callback(null, query);
  } else {
    geocode(query, queryString, function(error, geojson) {
      if (geojson) {
        data[query.type][query.query] = geojson;
      } else {
        data[query.type + 'Failed'][query.query] = true;
      }

      query.geojson = geojson;
      callback(null, query);
    });
  }
}

function geocode(query, queryString, callback) {
  request({
    url: 'https://api.erfgeo.nl/search?q=' + queryString,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200 && body.features.length > 0) {
      var feature = body.features[0];
      var pits = feature.properties.pits.filter(function(pit) {
        return pit.geometryIndex > -1
          && (feature.geometry.geometries[pit.geometryIndex].type === 'Point'
          || feature.geometry.geometries[pit.geometryIndex].type === 'LineString'
          || feature.geometry.geometries[pit.geometryIndex].type === 'MultiLineString')
      });
      if (pits.length > 0) {
        var pit = pits[0];
        var geojson = {
          type: 'Feature',
          properties: {
            query: query.query,
            pit: {
              hgid: pit.hgid,
              type: pit.type,
              uri: pit.uri,
              source: pit.source
            }
          },
          geometry: feature.geometry.geometries[pits[0].geometryIndex]
        }
        callback(null, geojson);
      } else {
        callback(null, null);
      }
    } else {
      callback(null, null);
    }
  });
}

var i = 0;
_(fs.createReadStream(path.join(__dirname, 'data', 'BR-1880-1890.csv'), {
    encoding: 'utf8'
  }))
  .split()
  .map(function(row) {
    var obj = {};
    var fields = row.split(';');
    columns.forEach(function(column) {
      obj[column] = fields[columns.indexOf(column)];
    });
    return obj;
  })
  .map(function(row) {
    return {
      achternaam: row.achternaam,
      voornaam: row.voornaam,
      tussenvoegsel: row.tussenvoegsel,
      patroniem: row.patroniem,
      geboortedatum: row.geboortedatum,
      geboorteplaats: row.geboorteplaats,
      beroep: row.beroep,
      straat: row.straat
    };
  })
  .map(createQueries)
  .compact()
  .flatten()
  .map(function(query) {
    return _.curry(geocodeQuery, query);
  })
  .nfcall([])
  .parallel(5)
  .each(function(obj) {
    i += 1;
    console.log(i)
  })
  .done(function() {

    var streetFeatures = new Array;
    for(var street in data.street) {
      streetFeatures.push(data.street[street]);
    }
    fs.writeFileSync('./data/streets.geojson', JSON.stringify({
      type: 'FeatureCollection',
      features: streetFeatures
    }, null, 2));

    var placeFeatures = new Array;
    for(var place in data.place) {
      placeFeatures.push(data.place[place]);
    }
    fs.writeFileSync('./data/places.geojson', JSON.stringify({
      type: 'FeatureCollection',
      features: placeFeatures
    }, null, 2));

    fs.writeFileSync('./data/br.json', JSON.stringify(data.br, null, 2));

    fs.writeFileSync('./data/streets.json', JSON.stringify(data.street, null, 2));
    fs.writeFileSync('./data/places.json', JSON.stringify(data.place, null, 2));
    fs.writeFileSync('./data/streets-failed.json', JSON.stringify(data.streetFailed, null, 2));
    fs.writeFileSync('./data/places-failed.json', JSON.stringify(data.placeFailed, null, 2));
  });
