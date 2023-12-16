const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'credentials/.env') });
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const uri = `mongodb+srv://${userName}:${password}@cluster0.mrmcjib.mongodb.net/?retryWrites=true&w=majority`;

const database = { db: "FinalProject", collection: "CMSC335"};
let app = express();

app.use(express.static(path.join(__dirname, 'public'), { "extensions": ["css"] }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');

// app.set('views', __dirname + '/pages');
// app.set('views', __dirname + 'public'); //added

app.set('views', [__dirname + '/pages', __dirname + '/public']);

app.get("/", (req, res) => {
    res.render('index.ejs'); 
});

app.get('/test/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

app.get('/addWatchList', (req, res) => {
    res.render('addWatchList.ejs'); 
});
app.get('/movieFinder', (req, res) => {
    res.render('movieFinder.ejs'); 
});
app.get('/viewWatchList', (req, res) => {
    res.render('viewWatchList.ejs'); 
});


app.post('/submit', async (req, res) => {
    const client = new MongoClient(uri);
    let {email, title, service} = req.body;
    try {
        await client.connect();
        await client.db(database.db).collection(database.collection).insertOne({email: email, title: title, service: service});
        res.render("processList.ejs", {email: email, title: title, service: service});
    } catch (e) {
        console.error('Error with form data:' + e);
    } finally {
        await client.close();
    }  
});

app.post("/retrieve", async (req, res) => {
    const client = new MongoClient(uri);
    let {email} = req.body
    try {
        await client.connect();
        const result = await client.db(database.db).collection(database.collection).find({email: {$eq: email}}).toArray();
        let rows = result.map(e => `<tr><td>${e.title}</td><td>${e.service}</td></tr>`);
        let table = `<table border='1'><head><tr><th>Title</th><th>Service</th></tr></head><body>${rows.join('')}</body></table>`;
        let vars = {
            table: table,
        };
        res.render("processRetrieve.ejs", vars);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get('/movieFinder', (request, response) => {
    response.render('movieFinder.ejs');
  });
 
 
 app.use(bodyParser.urlencoded({extended:false}));
 app.post("/processMovie", async (request, response) => {
    let {title} = request.body;
    const options = {
        method: 'GET',
        url: 'https://streaming-availability.p.rapidapi.com/search/title',
        params: {
          title: title,
          country: 'us',
          show_type: 'all',
          output_language: 'en'
        },
        headers: {
          'X-RapidAPI-Key': 'afc2b1bf13mshaa5b37bfbb9486cp12f933jsnf82ef6983d4d',
          'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
        }
      };
     
      try {
          const res = await axios.request(options);
          let movies = res.data.result.map(movie => {
            let services;
            if (movie.streamingInfo.us) {
                let lst = [];
                services = movie.streamingInfo.us.map(streamer => {
                    if (lst.includes(streamer.link)) {
                        return "";
                    } else {
                        lst.push(streamer.link);
                        return `<li><a href=\"${streamer.link}\">${streamer.service}</a></li>`;
                    }
            }).join(''); } else {
                services = "<li>No streaming options available</li>";
            }
            return `<li>${movie.title}<ul>${services}</ul></li>`;
          }).join('');
          response.render('processMovie.ejs', { movies });
      } catch (error) {
          console.error(error);
      }
  });
 
const portNumber = 5001
  app.listen(portNumber, (err) => {
    if (err) {
      console.log("Starting server failed.");
    } else {
      console.log(`To access server: http://localhost:${portNumber}`);
    }
  });
const message = "Stop to shutdown the server: ";
process.stdout.write(message);
process.stdin.setEncoding("utf8");
process.stdin.on("readable", () => {
  let input = process.stdin.read();
  if (input !== null) {
      let comm = input.trim();
    if (comm === "stop") {
      console.log("Shutting down the server");
      process.exit(0); 
    } else {
      console.log(`Invalid command: ${comm}`);
    }
    process.stdout.write(message);
    process.stdin.resume();
  }
});
