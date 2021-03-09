var request = require("request");
var fs = require("fs");
const lineReader = require("line-reader");
const priorityQ = require("./pq").pq;
const readline = require("readline");
const axios = require("axios").default;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const commands = ["fetch", "process", "end"];
const filePath = "doc.txt";
const outputPath = "result.json";
const flowPath = "flow.txt";
const freqPath = "freq.json";

let processUrl = "https://dictionary.yandex.net/api/v1/dicservice.json/lookup";

// fetch the document file
var download = function(uri, filename, callback) {
  request(uri)
    .pipe(fs.createWriteStream(filename))
    .on("close", callback);
};

// output min prirority queue to flow file for debugging
// ultimately fetch data for top words from yandex site
var outputMetrics = function(occurences, apiKey) {
  return new Promise((resolve, reject) => {
    let i = 0;
    let pq = new priorityQ();
    Object.keys(occurences).forEach(key => {
      if (i < 10) {
        pq.enqueue(key, occurences[key]);
      } else {
        if (occurences[key] > pq.front().priority) {
          pq.dequeue();
          pq.enqueue(key, occurences[key]);
        }
      }
      fs.appendFileSync(
        "flow.txt",
        "-------key: " +
          key +
          " value " +
          occurences[key] +
          "------------" +
          " \n "
      );
      fs.appendFileSync(flowPath, pq.printPQueue());
      i++;
    });

    let apis = [];
    pq.items.forEach(item => {
      apis.push(
        axios.get(processUrl + `?key=${apiKey}&lang=en-en&text=${item.element}`)
      );
    });

    Promise.all(apis)
      .then(resArr => {
        for (let i = 0; i < resArr.length; i++) {
          //console.log(resArr[i]);
          resArr[i] = {
            ...resArr[i].data,
            text: pq.items[i].element,
            noOfOccurences: pq.items[i].priority
          };
        }
        resolve(resArr);
      })

      .catch(error => {
        reject(error);
      });
  });
};

// take out words and number occurences from the downloaded file line by line
// build a in-memory counts maps
// call min priority queue to get top 10 occuring words and other meta data
var processFile = function(filename, apiKey) {
  return new Promise((resolve, reject) => {
    let prevOccurences = {};
    lineReader.eachLine(filename, (line, last) => {
      let words = line.split(" ");
      for (let i = 0; i < words.length; i++) {
        let word = words[i].trim();
        let pattern = /[a-zA-Z0-9]+/;
        let match = pattern.exec(word);
        if (match) {
          word = match[0].toLowerCase();
          if (prevOccurences[word]) {
            prevOccurences[word] = prevOccurences[word] + 1;
          } else {
            prevOccurences[word] = 1;
          }
        }
      }
      if (last) {
        fs.writeFileSync(freqPath, JSON.stringify(prevOccurences));
        outputMetrics(prevOccurences, apiKey)
          .then(res => {
            resolve(res);
          })
          .catch(error => {
            reject(error);
          });
      }
    });
  });
};

// fetch url, process key, end test commands
// for each new run, delete the flow.txt, freq.json (can ideally take an input as mode that takes input as debug on/off)
// improvement scopes :
//  a) efficient counts map handling
//  b) better error handling

rl.setPrompt("analyze>");
rl.prompt();
rl.on("line", function(line) {
  try {
    let command = line.trim().split(" ");
    if (commands.length < 2) {
      throw Error(
        "enter valid command from 'fetch <document_url_location>' or 'process <api_key>' or 'end test'"
      );
    }
    console.log(command);
    if (!commands.includes(command[0])) {
      throw Error(
        "enter valid command from 'fetch <document_url_location>' or 'process <api_key>' or 'end test' "
      );
    }
    if (command[0] == "fetch") {
      console.log("downloading...");
      download(command[1], filePath, () => {
        console.log("done downloading!!");
        rl.prompt();
      });
    } else if (command[0] == "process") {
      console.log("processing...");
      processFile(filePath, command[1]).then(val => {
        console.log("processing complete!!");
        fs.writeFileSync(outputPath, JSON.stringify(val));
        rl.prompt();
      });
    } else {
      rl.close();
      process.exit(0);
    }
  } catch (error) {
    console.log(error);
    rl.prompt();
  }
}).on("close", function() {
  process.exit(0);
});
