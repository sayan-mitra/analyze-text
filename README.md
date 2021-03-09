## To run the program

- npm start
- stdin takes 3 types of inputs (`fetch <document_url_location>` , `process <yandex_api_key>`, `end test`)
- Fetch the document using first command
- Then, call the `process command` with the apiKey.
- The result will be outputted to `result.json` file in the directory. The result file is attached in the repo for a run of the above steps for `big.txt` file
- Call `end test` to end the program
- The program outputs two debug files `flow.txt` and `freq.json` when the `process` command is run. They contain the queue i/o flow and the word frequency map. Please delete them after each run of the program
