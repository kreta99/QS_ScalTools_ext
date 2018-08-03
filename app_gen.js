var https = require('https');
var fs = require('fs');


const optionDefinitions = [
    { name: 'delete', alias: 'd', type: Boolean, defaultOption: false },
    { name: 'reload', alias: 'r', type: Boolean },
    { name: 'certpath', alias: 'c', type: String },
    { name: 'app', alias: 'a', type: String },
    { name: 'noofapps', alias: 'n', type: Number },
	{ name: 'offset', alias: 'o', type: Number },
    { name: 'help', alias: 'q', type: Boolean },
    { name: 'host', alias: 'h', type: String }

]

const commandLineArgs = require('command-line-args')
const command_options = commandLineArgs(optionDefinitions)
var appsCreated = [];

var options = {
   hostname: '',

   port: 4242,
   path: '/qrs/app?xrfkey=abcdefghijklmnop',
   method: 'GET',
   headers: {
      'x-qlik-xrfkey' : 'abcdefghijklmnop',
      'X-Qlik-User' : 'UserDirectory= Internal; UserId= sa_repository '
   },
   key: fs.readFileSync("C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\.Local Certificates\\client_key.pem"),
   cert: fs.readFileSync("C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\.Local Certificates\\client.pem"),
   ca: fs.readFileSync("C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\.Local Certificates\\root.pem")
};
var everyoneStream =''; 
var tagID =''; 
var AppId = '';
var noofapps='';

var app_name = 'ST';
var stream_name = 'CUST_';
var tag_name = 'Scaletest';
var offset = 0;


if(typeof command_options.certpath !=='undefined' &&  command_options.certpath !='')
{
    var lastChar = command_options.certpath.substr(command_options.certpath.length - 1);
    if(lastChar !== '\\')
    {
        command_options.certpath += "\\";
    }

    options.key = fs.readFileSync(command_options.certpath +  "client_key.pem"),
    options.cert= fs.readFileSync(command_options.certpath +  "client.pem"),
    options.ca= fs.readFileSync(command_options.certpath +  "root.pem")
}

if(command_options.help)
{
 console.log('-a ID of app to copy (GUID)')
 console.log('-c Directory where the certificates are stored, if not used the standard Qlik Sense directory will be used (C:\ProgramData\Qlik\Sense\Repository\Exported Certificates\.Local Certificates)');
 console.log('-d Delete all apps and streams used for scalability, this parameter ignores all other parameters apart from –c and -h');
 console.log('-h Qlik Sense hostname');
 console.log('-n Number of copies of the app');
 console.log('-o Offset for streams numbering. Optional, default 0');
 console.log('-r All copies will be reloaded after creation, use this if you have random data generated in the app');

}
else if(command_options.delete)
{
    
        if(command_options.host !=='' && typeof command_options.host !== 'undefined')
           {
            
            options.hostname = command_options.host;
            deleteApps();
			deleteStreams();
           }
        
        else
        {
           console.log('Hostname not defined') 
        }

    

}
else
{
    if(command_options.app !=='' && typeof command_options.app !== 'undefined')
    {
        if(command_options.noofapps !=='' && typeof command_options.noofapps !== 'undefined')
        {
            if(command_options.host !=='' && typeof command_options.host !== 'undefined')
           {
            AppId = command_options.app;
            noofapps =command_options.noofapps;
            options.hostname = command_options.host;
            findStreamID();
           }
            else
            {
               console.log('Hostname not defined') 
            }
        }
        else
        {
            console.log('Number of apps not defined')
        }
    }
    else
    {
        console.log('App not defined')
    }
}


if(command_options.offset !=='' && typeof command_options.offset !== 'undefined')
        {
			offset =command_options.offset;
		}


function setTagOnApp(app, app_num)
{
    

    var d = new Date();
    var lm = d.toISOString();

    options.path = '/qrs/app/'+ app.id +'?xrfkey=abcdefghijklmnop'
    options.method = 'PUT';

    app.lastModified = lm;
    app.tags.push({ 'id': tagID });


    
var req = https.request(options, function (res) {

    var chunks = [];
    
    
    res.on("data", function (chunk) {
    
        chunks.push(chunk);
      });
    
      
        res.on("end", function () {
    
            var body = Buffer.concat(chunks);
			createStream(app, app_num);
           if(command_options.reload)
           {
                
                reloadApp(app.id);
           }
        });
    });

    
    
    
    req.write(JSON.stringify(app));
    req.end();
}

function publishApp(app, stream_id)
{
    
    //options.path = '/qrs/App/'+ app.id +'/publish?name='+encodeURIComponent(app.name)+'&stream='+everyoneStream+'&xrfkey=abcdefghijklmnop'
	options.path = '/qrs/App/'+ app.id +'/publish?name='+app_name+'&stream='+stream_id+'&xrfkey=abcdefghijklmnop'
    options.method = 'PUT';

    var req = https.request(options, function (res) {
        var chunks = [];
      
        res.on("data", function (chunk) {
          chunks.push(chunk);
        });
      
        res.on("end", function () {
          var body = Buffer.concat(chunks);
          
        });
      });
      
      req.end();
    
}


function reloadApp(app){
    
    options.path = '/qrs/app/'+ app+'/reload?xrfkey=abcdefghijklmnop'
    options.method = 'POST';

    var req = https.request(options, function (res) {

        var chunks = [];
        
        
        res.on("data", function (chunk) {
        
            chunks.push(chunk);
          });
        
          
            res.on("end", function () {
        
                var body = Buffer.concat(chunks);
                
                
             
            });
        });

        req.write('');
        req.end();

}



function getapps()
{
https.get(options, function(res) {
   
   res.on("data", function(chunk) {
      
      
   });
   }).on('error', function(e) {
      console.log("Got error: " + e.message);
});
}



function copyApp(app_num)
{
options.path = '/qrs/App/' + AppId + '/copy?xrfkey=abcdefghijklmnop';
options.method = 'POST'


https.get(options, function(res) {
   //console.log("Got response from Qlik: " + res.statusCode);
   res.on("data", function(chunk) {
      var app = JSON.parse(chunk.toString())
      appsCreated.push(app.id);
      
      setTagOnApp(app,app_num);
     

   });
   }).on('error', function(e) {
      console.log("Got error: " + e.message);
});
}



function findStreamID() {
options.path = '/qrs/Stream/table?filter=(name+eq+%27Everyone%27)&orderAscending=true&skip=0&sortColumn=name&take=200&xrfkey=abcdefghijklmnop';
options.method = 'POST'
options.headers = {"content-type": "application/json",
      'x-qlik-xrfkey' : 'abcdefghijklmnop',
      'X-Qlik-User' : 'UserDirectory= Internal; UserId= sa_repository '}

var req = https.request(options, function (res) {

var chunks = [];


res.on("data", function (chunk) {

    chunks.push(chunk);
  });

  
    res.on("end", function () {

	    var body = Buffer.concat(chunks);
			

  
	    everyoneStream = JSON.parse(body.toString()).rows[0][0];
          getTag();

	});


});

req.write('{"entity":"Stream","columns":[{"name":"id","columnType":"Property","definition":"id"},{"name":"privileges","columnType":"Privileges","definition":"privileges"},{"name":"name","columnType":"Property","definition":"name"},{"name":"tags","columnType":"List","definition":"tag","list":[{"name":"name","columnType":"Property","definition":"name"},{"name":"id","columnType":"Property","definition":"id"}]}]}');
req.end();
}

function getTag(){  
      options.path = '/qrs/Tag/table?filter=(name+eq+%27Scaletest%27)&orderAscending=true&skip=0&sortColumn=name&take=200&xrfkey=abcdefghijklmnop';
      options.method = 'POST'

      options.headers = {"content-type": "application/json",
      'x-qlik-xrfkey' : 'abcdefghijklmnop',
      'X-Qlik-User' : 'UserDirectory= Internal; UserId= sa_repository '}

var req = https.request(options, function (res) {
var chunks = [];

res.on("data", function (chunk) {
    chunks.push(chunk);
  });

  
    res.on("end", function () {

	    var body = Buffer.concat(chunks);
			
        
        var tagLength =  JSON.parse(body.toString()).rows.length;
        if(tagLength > 0)
        {
            tagID = JSON.parse(body.toString()).rows[0][0];
			var nofa = offset + noofapps;
			for(n=offset; n<nofa; n++) {
				(function(app_num){ 
					setTimeout(function() { 
						console.log("App nr: " + app_num + " created");
						copyApp(app_num);
					}, (app_num-offset)*1000);
				})(n+1);
            }
        }
        else
        {
            return createTag();
        }
 
	});

})

req.write('{"entity":"Tag","columns":[{"name":"id","columnType":"Property","definition":"id"},{"name":"privileges","columnType":"Privileges","definition":"privileges"},{"name":"name","columnType":"Property","definition":"name"},{"name":"occurrences","columnType":"Function","definition":"Count(EngineService,PrintingService,ProxyService,VirtualProxyConfig,RepositoryService,SchedulerService,ServerNodeConfiguration,App,App.Object,ReloadTask,ExternalProgramTask,UserSyncTask,SystemRule,Stream,User,UserDirectory,DataConnection,Extension,ContentLibrary)"}]}');

req.end();

}


function createTag(){
      options.path = '/qrs/Tag?privileges=true&xrfkey=abcdefghijklmnop';
      options.method = 'POST'

      options.headers = {"content-type": "application/json",
      'x-qlik-xrfkey' : 'abcdefghijklmnop',
      'X-Qlik-User' : 'UserDirectory= Internal; UserId= sa_repository '}

      
var req = https.request(options, function (res) {

      var chunks = [];
      
      
      res.on("data", function (chunk) {
      
          chunks.push(chunk);
        });
      
        
          res.on("end", function () {
      
                var body = Buffer.concat(chunks);
                JSON.parse(body.toString());
                getTag();
      
      })
      
})
req.write('{"name":"'+tag_name+'"}');
req.end();

}

function deleteApps()
{
    options.path = '/qrs/App/table?filter=(tags.name+eq+%27Scaletest%27)&orderAscending=true&skip=0&sortColumn=name&xrfkey=abcdefghijklmnop';
    options.method = 'POST',
    options.headers = {"content-type": "application/json",
      'x-qlik-xrfkey' : 'abcdefghijklmnop',
      'X-Qlik-User' : 'UserDirectory= Internal; UserId= sa_repository '}

    var req = https.request(options, function (res) {
        var chunks = [];
        
        res.on("data", function (chunk) {
            chunks.push(chunk);
          });
        
          
            res.on("end", function () {
				
                var body = Buffer.concat(chunks);
                var d = 0;
				
				
                JSON.parse(body.toString()).rows.forEach(function(e) {
                    
                    deleteApp(e[0]);
					d++;

                })
                console.log("Found " + d + " apps");
				
                return;
            });
        })
        
        req.write('{"entity":"App","columns":[{"name":"id","columnType":"Property","definition":"id"},{"name":"privileges","columnType":"Privileges","definition":"privileges"},{"name":"name","columnType":"Property","definition":"name"},{"name":"owner","columnType":"Property","definition":"owner"},{"name":"publishTime","columnType":"Property","definition":"publishTime"},{"name":"AppStatuss","columnType":"List","definition":"AppStatus","list":[{"name":"statusType","columnType":"Property","definition":"statusType"},{"name":"statusValue","columnType":"Property","definition":"statusValue"},{"name":"id","columnType":"Property","definition":"id"}]},{"name":"stream","columnType":"Property","definition":"stream"},{"name":"tags","columnType":"List","definition":"tag","list":[{"name":"name","columnType":"Property","definition":"name"},{"name":"id","columnType":"Property","definition":"id"}]}]}');
        req.end();
        
}

function deleteApp(id)
{
    options.path = '/qrs/app/'+id+'?xrfkey=abcdefghijklmnop';
    options.method = 'DELETE';
    


    var req = https.request(options, function (res) {
        var chunks = [];
        
        res.on("data", function (chunk) {
            chunks.push(chunk);
          });
        
          
            res.on("end", function () {
        
                var body = Buffer.concat(chunks);
				console.log("App deleted: " + id);
               
                //console.log(JSON.parse(body.toString()));

            });
        
        })
        
        req.write('');
        req.end();

    

}

function createStream(app, app_num) {
	
	options.path = '/qrs/stream?xrfkey=abcdefghijklmnop';
    options.method = 'POST';
	
	var req = https.request(options, function (res) {
		 
		var chunks = [];
		var str_id = '';
		res.on("data", function (chunk) {
			chunks.push(chunk);
		  });
	 
		res.on("end", function () {
			var body = Buffer.concat(chunks);
			var stream = JSON.parse(body);
			setTagOnStream(stream);
			var stream_id = String(stream.id);
			publishApp(app, stream_id);
			console.log("created stream " + stream_id + " for app: " + app.id);
		});
	});

	req.write('{"name":"' + stream_name + app_num + '"}');
	req.end();

}

function setTagOnStream(stream)
{
    

    var d = new Date();
    var lm = d.toISOString();

    options.path = '/qrs/stream/'+ stream.id +'?xrfkey=abcdefghijklmnop'
    options.method = 'PUT';

    stream.lastModified = lm;
    stream.tags.push({ 'id': tagID });


    
var req = https.request(options, function (res) {

        
    res.on("data", function (chunk) {
    
    });
     
    res.on("end", function () {
    
    });
    });
	
    req.write(JSON.stringify(stream));
    req.end();
}


function deleteStreams()
{
    options.path = '/qrs/Stream/table?filter=(tags.name+eq+%27Scaletest%27)&orderAscending=true&skip=0&sortColumn=name&xrfkey=abcdefghijklmnop';
    options.method = 'POST',
    options.headers = {"content-type": "application/json",
      'x-qlik-xrfkey' : 'abcdefghijklmnop',
      'X-Qlik-User' : 'UserDirectory= Internal; UserId= sa_repository '}

    var req = https.request(options, function (res) {
        var chunks = [];
        
        res.on("data", function (chunk) {
            chunks.push(chunk);
          });
        
          
            res.on("end", function () {
				
                var body = Buffer.concat(chunks);
                var d = 0;
				
				
                JSON.parse(body.toString()).rows.forEach(function(e) {
                    
                    deleteStream(e[0]);
					d++;

                })
                console.log("Found " + d + " streams");
				
                return;
            });
        })
        
        req.write('{"entity":"Stream","columns":[{"name":"id","columnType":"Property","definition":"id"},{"name":"privileges","columnType":"Privileges","definition":"privileges"},{"name":"name","columnType":"Property","definition":"name"},{"name":"owner","columnType":"Property","definition":"owner"},{"name":"publishTime","columnType":"Property","definition":"publishTime"},{"name":"AppStatuss","columnType":"List","definition":"AppStatus","list":[{"name":"statusType","columnType":"Property","definition":"statusType"},{"name":"statusValue","columnType":"Property","definition":"statusValue"},{"name":"id","columnType":"Property","definition":"id"}]},{"name":"stream","columnType":"Property","definition":"stream"},{"name":"tags","columnType":"List","definition":"tag","list":[{"name":"name","columnType":"Property","definition":"name"},{"name":"id","columnType":"Property","definition":"id"}]}]}');
        req.end();
        
}

function deleteStream(id)
{
    options.path = '/qrs/stream/'+id+'?xrfkey=abcdefghijklmnop';
    options.method = 'DELETE';
    


    var req = https.request(options, function (res) {
        var chunks = [];
        
        res.on("data", function (chunk) {
            chunks.push(chunk);
          });
        
          
            res.on("end", function () {
        
                var body = Buffer.concat(chunks);
				console.log("Stream deleted: " + id);
          
            });
        
        })
        
        req.write('');
        req.end();

}