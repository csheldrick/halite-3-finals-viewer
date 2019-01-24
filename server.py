from flask import Flask,  request, jsonify, render_template
import requests
import os, json
from config import users, leaderboard_interval, finals_interval, game_feed_interval


def root_dir():
    return os.path.abspath(os.path.dirname(__file__))


app = Flask(__name__, static_folder='./')

base_api = "https://api.2018.halite.io/v1/api/{}"
match_api = base_api.format("user/{}/match?order_by=desc,time_played&offset=0&limit=10")
lb_api = base_api.format("leaderboard?limit=10000")
llb_api = base_api.format("leaderboard?offset={}&limit={}")
user_api = base_api.format("user/{}")
bot_api = base_api.format("user/{}/bot")
finals_api = base_api.format("finals")

TIMEOUT = 5


@app.route('/', methods=['GET'])
def index():
    return render_template("multi-view.html", users=list(users.keys()), names=list(users.values()), game_feed_interval=game_feed_interval, finals_interval=finals_interval, leaderboard_interval=leaderboard_interval)


def get_user(user_id):
    resp = requests.get(user_api.format(user_id)).json()
    return resp


def get_bot(user_id):
    resp = requests.get(bot_api.format(user_id)).json()[0]
    return resp


def get_rank(user_id=None, bot_dict=None):
    if bot_dict is None:
        bot_dict = get_bot(user_id)
    return bot_dict['rank']


def get_match_count(user_id=None, bot_dict=None):
    if bot_dict is None:
        bot_dict = get_bot(user_id)
    return bot_dict['games_played']


def get_version(user_id=None, bot_dict=None):
    if bot_dict is None:
        bot_dict = get_bot(user_id)
    return bot_dict['version_number']


@app.route('/api/leaderboard', methods=['GET'])
def lb():
    resp = requests.get(lb_api, timeout=TIMEOUT).json()
    resp = {'leaderboard': resp}
    return jsonify(resp)


@app.route('/api/live_leaderboard', methods=['GET'])
def live_lb():
    user = request.args.get('user', None)
    rank = get_rank(user)
    limit = 9
    offset = int(rank - ((limit + 1) / 2))
    resp = requests.get(llb_api.format(offset, limit), timeout=TIMEOUT).json()
    for entry in resp:
        entry['rating'] = entry['score']
        entry['games'] = entry['num_games']
    resp = {"leaderboard": resp}
    return jsonify(resp)


def get_matches(user_id):
    resp = requests.get(match_api.format(user_id), timeout=TIMEOUT).json()
    games = []
    for game in resp:
        players = [game['players']]
        game['players'] = players
        games.append(game)
    return games


@app.route('/api/game_feed', methods=['GET'])
def matches():
    users = request.args.get('users', "264")
    resp = requests.get(match_api.format(users), timeout=TIMEOUT).json()
    d = {'games': []}
    for game in resp:
        players = game['players']
        _players = []
        for player_id in players:
            bot_dict = get_bot(player_id)
            version = get_version(bot_dict=bot_dict)
            stats = game['stats']['player_statistics'][players[player_id]['player_index']]
            players[player_id].update(stats)
            players[player_id]['user_id'] = player_id
            players[player_id]['version'] = version
            _players.append(players[player_id])

        game['map_size'] = game['map_width']
        game['turns'] = game['turns_total']
        game['players'] = _players
        d['games'].append(game)
    resp = d
    return jsonify(resp)


@app.route("/api/finals", methods=["GET"])
def finals():
    resp = requests.get(finals_api).json()
    return jsonify(resp)


@app.route("/<file>", methods=['GET'])
def get_file(file):
    filepath = root_dir() + f"\\static\\{file}"
    if not os.path.isfile(filepath):
        url = f"https://github.com/{file}"
        resp = requests.get(url)
        if resp.status_code == 200:
            f = open(filepath, 'wb')
            f.write(resp.content)
            f.close()
    try:
        data = open(filepath, 'rb').read()
    except:
        data = ""
    return data


if __name__ == "__main__":
    app.run('0.0.0.0', 80)
