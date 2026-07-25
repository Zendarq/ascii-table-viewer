from flask import Flask, render_template

from ascii_data import ASCII_DATA

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html", ascii_data=ASCII_DATA)


if __name__ == "__main__":
    app.run(debug=False)
