//global.setImmediate = global.setImmediate || process.nextTick.bind(process)
var app = require('express')(),
    formidable = require('formidable');

var bodyParser = require('body-parser')
var express = require('express');
var app = express();
var router = express.Router();
var fs = require('fs');
var multiparty = require('multiparty');
var moment = require('moment');


app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use("/calendar_json", express.static(__dirname + '/calendar_json'));
app.use("/forms", express.static(__dirname + '/forms'));
app.use("/results", express.static(__dirname + '/results'));

//Lets return special form for user
app.get('/', function(req, res){
    res.sendfile(__dirname + '/forms/form_to_submit_data.html');
});

//Lets see what in our json
app.get('/calendar_json', function(req, res){
      res.sendfile(__dirname + '/calendar_json/calendar.json');
});

//create piece_of_table
app.get('/calendar_json/piece_of_table', function(req, res){
    var from = req.param('from'),
        to = req.param('to'),
        ans = JSON.parse(fs.readFileSync('./calendar_json/calendar.json'));

    result = getJsonByDate(ans, from,to);
    console.log(result);
    if (Object.keys(result).length > 0) {
        res.send('<html><head><style>table {color: black; border: 2px solid black;}td {color:black;border: 1px solid black;}</style></head><body>'+getTableFromJson(result) + '</body></html>');
    }
    else{
        res.send('<h2 style="position:relative;top: 20px; left:200px;"><span><font size="3" color = "red">Sorry, no events to show for this range</font></span></h2>');
    }
});

//Lets see what is uploaded to our server
app.post('/upload', function(req, res) {
    var form = new formidable.IncomingForm();
    form.uploadDir = './calendar_json';
    form.on('end', function() {
        res.writeHead(200, {"content-type":"text/html"});
        res.end('New version is uploaded. Previous version is saved on server');
    })
    form.on('file', function(field, file) {
            fs.unlink('./calendar_json/calendar.previous', function (err) {
                if (err) throw err;
                console.log('successfully deleted');
            });
            fs.rename('./calendar_json/calendar.json', './calendar_json/calendar.previous');
            fs.rename(file.path, form.uploadDir + "/" + 'calendar.json');
    });
    form.parse(req);

});



//Lets check users submission
app.post('/results', function(req, res){

    var name = req.body.event_name,
        date = req.body.date,
        event_type = req.body.event_type,
        country = req.body.country,
        action = req.body.action,
        basic_key = event_type + '_' + country,
        ans = JSON.parse(fs.readFileSync('./calendar_json/calendar.json'));

    if(typeof ans[basic_key] == 'undefined'){
        ans[basic_key] = {};
        console.log('FFFFFFFFFFUUUUUUU');
    }

    if(action == 'submit'){
        ans[basic_key][date] = name;
    }else{
        delete ans[basic_key][date];
    }

    fs.writeFileSync('./calendar_json/calendar_test.json', JSON.stringify(ans));

    res.send('<html><head><script src="//code.jquery.com/jquery-1.10.2.js"></script><script src="//code.jquery.com/ui/1.11.2/jquery-ui.js"></script><link rel="stylesheet" href="/resources/demos/style.css"><script type="text/javascript"></script><style>table {color: black; border: 2px solid black;}td {color:black;border: 1px solid black;}</style></head><body><form action="http://nephidei.i.fog.yandex.net:3000/results_approved"><input type="submit" value="Save changes!"></form><form action="http://nephidei.i.fog.yandex.net:3000/undo"><input type="submit" value="Undo!"></form></body></html>');
});


function resSend(){
    var ans = JSON.parse(fs.readFileSync('./calendar_json/calendar.json'));
    return '<html><head><script src="//code.jquery.com/jquery-1.10.2.js"></script><script src="//code.jquery.com/ui/1.11.2/jquery-ui.js"></script><link rel="stylesheet" href="/resources/demos/style.css"><script type="text/javascript"></script><style>table {color: black; border: 2px solid black;}td {color:black;border: 1px solid black;}</style></head><body><form action="http://nephidei.i.fog.yandex.net:3000/"><input type="submit" value="RETURN TO MAIN PAGE"></form>' +getTableFromJson(ans) + '</body></html>';
}



//If submitter is sure that everything is ok
app.get('/results_approved', function(req, res){

    fs.unlink('./calendar_json/calendar.json', function (err) {
    if (err) throw err;
    });
    fs.rename('./calendar_json/calendar_test.json', './calendar_json/calendar.json');
    res.send(resSend());
});

//If submitter decided to undo
app.get('/undo', function(req,res){
    fs.unlink('./calendar_json/calendar_test.json', function (err) {
    if (err) throw err;
    });
    res.send(resSend());
});





/**
 * get range of dates
 */

Date.prototype.addDays = function(days) {
    var dat = new Date(this.valueOf())
    dat.setDate(dat.getDate() + days);
    return dat;
}

function getDateRange(startDate, stopDate) {
    var dateArray = new Array();
    var pattern = /(\d{4})(\d{2})(\d{2})/;
    var startDate = startDate.replace(pattern, '$1/$2/$3');
    var stopDate = stopDate.replace(pattern, '$1/$2/$3');
    var startDate = new Date(startDate);
    var stopDate = new Date(stopDate);
    var currentDate = startDate;

    while (currentDate <= stopDate) {
        dateArray.push( new Date (currentDate) )
        currentDate = currentDate.addDays(1);
    }
    return dateArray;
}


/**
 * @param {Object} obj
 * @param {String} date
 * @returns {Object}
 */
function getJsonByDate(obj, from, to) {
    if (from && to){
        var keys_arr = Object.keys(obj),
            json_obj = {},
            dates_arr = getDateRange(from,to);
            console.log(dates_arr);
        keys_arr.forEach(function(name) {
            json_obj[name] = {};
            dates_arr.forEach(function(date){
                var date = moment(date).format('YYYYMMDD');
                console.log(date);
                if (typeof obj[name] !== 'undefined'){
                    if (typeof obj[name][date] !== 'undefined'){
                        json_obj[name][date] = obj[name][date];

                    }
                }
            });
        });
        return json_obj;
    }
    return null;
}

/*
 * @param {Object} obj
 * @param {String} date
 * @returns {String}
 */
function getTableFromJson(obj) {
    return Object.keys(obj).map(function(elem, i) {
        return '<h2>' + elem + '</h2><table>' + getEventsTrs(obj[elem]) + '</table>';
    }).join('');
}

function getEventsTrs(elem) {
    return Object.keys(elem).map(function(el, i) {
        return '<tr><td>' + el + '</td><td>' + elem[el] + '</td></tr>';
    }).join('');
}

app.listen(3000);
