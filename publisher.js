
var fs = require('fs'),
    os = require('os'),
    colors = require('colors'),
    exec = require('child_process').exec,
    server = process.argv[2],
    port = process.argv[3];

function publish(directoryName, callback) {
  // Ignore .bin folders
  if (directoryName.indexOf('.bin') >= 0) {
    callback();
    return;
  }

  console.log('publishing ' + directoryName);

  exec('npm --registry http://' + server + ':' + port + ' publish', {
    cwd: directoryName
  }, function(err, stdout, stderr) {
    if (err) {
      // Ignore errors concerning publishing conflicts (these are expected),
      // but report all other errors and stop
      if (stderr.indexOf('EPUBLISHCONFLICT') < 0) {
        console.log(stderr.red);
        return;
      }
    }

    // Is there a node_modules directory?
    var nodeModulesDir = directoryName + '/node_modules';
    fs.exists(nodeModulesDir, function(exists) {
      if (exists) {
        fs.readdir(nodeModulesDir, function(err, files) {
          var countComplete = 0;
          var publishingDoneCallback = function() {
            countComplete++;
            if (countComplete == files.length) {
              callback();
            }
          };

          for (var i = 0; i < files.length; i++) {
            publish(nodeModulesDir + '/' + files[i], publishingDoneCallback);
          }
        });
      }
      else {
        callback();
      }
    });
  });
}

function deleteFolderRecursive(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

if (process.argv.length === 4) {
  exec('npm install', function(err, stdout, stderr) {
    if (err) {
      console.log(stderr.red);
      return;
    }

    publish(process.cwd(), function() {
      console.log('all done');
    });
  });
}
else if (process.argv.length === 5) {
  // npm install to temp directory
  var tmpDir = os.tmpdir() + 'publisher';
  var moduleName = process.argv[4];

  fs.exists(tmpDir, function(exists) {
    if (exists) {
      deleteFolderRecursive(tmpDir);
    }

    fs.mkdir(tmpDir, function() {
      exec('npm install ' + moduleName, {
        cwd: tmpDir
      }, function(err, stdout, stderr) {
        if (err) {
          console.log(stderr.red);
          return;
        }
        var moduleDirectory = tmpDir + '/node_modules/' + moduleName;

        publish(moduleDirectory, function() {
          console.log('all done');
          deleteFolderRecursive(tmpDir);
        });
      });
    });
  });
}
else {
  console.log('Usage:'.red.bold);
  console.log('  node publisher <npmserver> <port>'.red);
  console.log('    Will publish this package and each of its dependencies'.red);
  console.log('');
  console.log('  node publisher <npmserver> <port> <package_name>'.red);
  console.log('    Will install given package from the external NPM and install each dependency as well'.red);
}