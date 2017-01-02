var cp = require('child_process');
var readline = require('readline');

var io = require('socket.io').listen(8000);
var fs = require('fs');

var clients = []; // socket of connected client
var client_name = []; // username of connected client
var client_userid = []; // userid of connected client
var conn_client = -1; // index of clients[] and client_name(online)

console.log("Server start!");


var userArray = fs.readFileSync('user.cfg').toString().split("\n");

/*create directory tree to store upload files*/
var rootDir = "uploads"; 

try {
  fs.accessSync(rootDir);
} catch (e) {
  fs.mkdirSync(rootDir);
}

var tokens = [];

for (i in userArray) {
    tokens = userArray[i].split(":");
    console.log(tokens[0]);
    try {
        fs.accessSync(rootDir+"/"+tokens[0]);
    } catch (e) {
        fs.mkdirSync(rootDir+"/"+tokens[0]);
    }
}

io.on('connection', function(socket) {

	conn_client++;
	var my_client_num = conn_client;
  	clients[my_client_num] = socket;

  	/* server's handler for "login" */
	socket.on('login',function(id, pwd){
		console.log("[Login]:"+id);
		console.log("[Login]:"+pwd);
		/* find valid user */
		var valid = false;

        userArray = fs.readFileSync('user.cfg').toString().split("\n");
		for(i in userArray) {
			if(userArray[i] == id+":"+pwd){
				client_userid[my_client_num] = i;
				console.log("VALID!");
				valid = true;
			}
		}
	
		if(valid) {
			client_name[my_client_num] = id;
			var sendArr = [];
			for(i in userArray) {
				var oneline = userArray[i].toString().split(":");
				if(oneline[0] != "")
					sendArr[i] = oneline[0];
			}
			clients[my_client_num].emit('loginAck', "success", sendArr);
		} else
			clients[my_client_num].emit('loginAck', "fail", []);
	
	});
	/* server's handler for "register" */
	socket.on('register',function(id, pwd){
		console.log("[Register]:"+id);
		console.log("[Register]:"+pwd);

        userArray = fs.readFileSync('user.cfg').toString().split("\n");
		var valid = true;
		for(i in userArray) {
			var arr = userArray[i].toString().split(":");
			if(arr[0] == id){
				console.log("USED!");
				valid = false;
			}
		}

		if(valid) {
			fs.appendFile('user.cfg', id+":"+pwd+"\n", function (err){});
            try {
                fs.accessSync(rootDir+"/"+id);
            } catch (e) {
                fs.mkdirSync(rootDir+"/"+id);
            }
			io.to(socket.id).emit('registerAck', "success");
		} else
			io.to(socket.id).emit('registerAck', "fail");

	});

	socket.on('message',function(objectName ,data){
		console.log("[Message to]: "+objectName);
		console.log("[Message]: "+data);

		/* send to the other */
		var objectIndex;
		var find = false;
		for(i in client_name) {
			if(client_name[i] == objectName){
				objectIndex = i;
				find = true;
				console.log("FIND YOU!");
			//	break;
			}
		}
		if(find)
			clients[objectIndex].emit('messageFromOther', client_name[my_client_num], data);
		/* write to file */
		// var first, second;
		// fs.appendFile("HistoricalMsg/"+first+second+".cfg", data+"\n", function (err){});
	
		clients[my_client_num].emit('messageAck', "success");

	});

	socket.on('fileUpload',function(objectName , filename, data){
		console.log("[File to]: "+objectName);
		console.log("[File Name]: "+filename);

		/* send to the other */
        userArray = fs.readFileSync('user.cfg').toString().split("\n");
		var objectIndex;
		var find = false;
		for(i in userArray) {
            var validUser = userArray[i].toString().split(":");
			if(validUser[0] == objectName){
				find = true;
				console.log("FIND YOU!");
			}
		}
		if (find) {
            fs.writeFileSync(rootDir+"/"+objectName+"/"+filename, data, 'binary');
            console.log("file upload success!");
	    }	
        clients[my_client_num].emit('fileUploadAck', "success");

	});
	
    socket.on('fileDownload',function(usrName, filename){
        userArray = fs.readFileSync('user.cfg').toString().split("\n");
		for(i in userArray) {
            var validUser = userArray[i].toString().split(":");
			if(validUser[0] == usrName){
				find = true;
				console.log("FIND YOU!");
			}
		}
		console.log("[File request]: "+usrName);
		console.log("[File Name]: "+filename);
		/* send to the other */
        var data;
        fs.readFileSync(rootDir+"/"+usrName+"/"+filename, data, 'binary');
        console.log("file download success!");
        io.to(socket.id).emit('fileDownloadAck', filename, data);

	});
	/*socket.on('disconnect',function(){
		io.emit('all_disconnect');
		process.exit();
	});*/
});
