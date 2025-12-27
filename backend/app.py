from flask import Flask, request
import time
import sqlite3


app = Flask(__name__)



@app.route("/")
def home():
    return {"status":"backend is working"}

@app.route("/api/balance")
def balance():
    return {"balance": 1000}

@app.route("/api/transation", methods=["POST"])
def transation():
    data = request.json
    return {"status": "ok"}


app.run(debug=True)

