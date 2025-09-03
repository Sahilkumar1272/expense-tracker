from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Import config
app.config.from_object("config.Config")

db = SQLAlchemy(app)

@app.route("/")
def home():
    return {"message": "Expense Tracker Backend Running"}

if __name__ == "__main__":
    app.run(debug=True)
