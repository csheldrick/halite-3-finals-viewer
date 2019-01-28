$(document).ready(function () {
    requestLeaderboard()
})

function requestLeaderboard() {
    $.ajax({
        url: "api/leaderboard",
        contentType: "json",
        dataType: "json",
        success: function (data) {
            leaderboard = data.leaderboard
            total_players = leaderboard.length
            updateRanks()
            updateFinals()
            updateLiveLeaderboard()
            updateLiveGameFeed()
        }
    })
}

function leaderboardRankToTier(rank) {
    if (rank / total_players <= (1 / 100)) return 5
    if (rank / total_players <= ((1 + 5) / 100)) return 4
    if (rank / total_players <= ((1 + 5 + 10) / 100)) return 3
    if (rank / total_players <= ((1 + 5 + 10 + 25) / 100)) return 2
    return 1
}

function tierNameFromIndex(tier_index) {
    switch (tier_index) {
        default:
        case 1:
            return "Bronze"
        case 2:
            return "Silver"
        case 3:
            return "Gold"
        case 4:
            return "Platinum"
        case 5:
            return "Diamond"
    }
}

function leaderboardRankToTierImage(rank) {
    var tier_index = leaderboardRankToTier(rank)
    if (tier_index == 0) return ""
    var name = tierNameFromIndex(tier_index)
    return '<img class="tier" src="https://halite.io/assets/images/level-' + tier_index + '.png" alt="' + name + '" title="' + name + '">'
}

function getProfileImage(player, only_url) {
    // TODO Google Fallback

    var url = '/' + (player.profile_image_key == null ? player.username : player.profile_image_key) + '.png'
    if (only_url) {
        return url
    }
    else {
        return '<img class="profile-pic" src="' + url + '" alt="' + player.username + '">'
    }

}

function updateRanks() { // (and users)

    if (leaderboard == null) return

    $(".rankof").each(function () {
        var uid = $(this).data("user-id")
        var p = getUserFromId(uid)
        $(this).html("#" + p.rank + " " + leaderboardRankToTierImage(p.rank))
    })

    $("*[data-user-id]").each(function () {
        var uid = $(this).data("user-id")
        var u = getUserFromId(uid)

        if (u != null) {
            $(this).children(".rank").html("#" + u.rank + " " + leaderboardRankToTierImage(u.rank))
            $(this).children(".profile-pic").attr('src', getProfileImage(u, true))
            $(this).children(".username").html(u.username)
        } else {
            $(this).children(".username").html("Unknown (" + uid + ")")
        }
    })
}

function getUserFromId(id) {
    id = parseInt(id)
    return leaderboard.filter(u => {
        return u.user_id === id
    })[0]
}

function formatNumber(x) {
    return x.toLocaleString()
}

function user_name(user_id) {
    return names[users.indexOf(user_id)]
}

// Live GameFeed
function updateLiveGameFeed() {
    for (var user of users) {
        refreshLiveGameFeed(user)
    }
    setTimeout(updateLiveGameFeed, game_feed_interval)
}

function refreshLiveGameFeed(user) {
    var limit = 10
    var first = game_feed_last_game[user] == null
    var name = user_name(user)
    //var user = parseInt($("#user-select").val())
    var api = `/api/game_feed?users=` + user

    if (first) {
        $("#game-feed-" + name).html('<tr><td colspan="5">Loading...</tr></td>')
    }

    $.ajax({
        url: api,
        success: function (games) {
            games = games.games
            games.sort(function (a, b) {
                return a.game_id - b.game_id
            })
            if (!first) {
                if (games[games.length - 1].game_id === game_feed_last_game[user].game_id) {
                    return
                }
            }
            //console.log("updating game feed")
            $("#game-feed-" + name).html("")
            // sort because the first request must be done in desc order

            for (var i in games) {
                var game = games[i]
                // render row
                var result_html = ""

                var max_production = 0
                for (var i of game.players)
                    max_production = Math.max(max_production, i.final_production)

                for (var rank = 1; rank <= 4; rank++) {
                    for (var player_index in game.players) {

                        var player = game.players[player_index]

                        var player_user_id = player.user_id
                        var player_score = player.final_production

                        if (player.rank != rank) continue // dirty way :(

                        var perc = (player_score / max_production) * 100
                        var io = users.indexOf(player_user_id)
                        var col = 'rgba(0, 89, 255, 0.47)'
                        if (io != -1) {
                            switch (io) {
                                case 0:
                                    col = 'rgba(255, 141, 0, 0.47)'
                                    break
                                case 1:
                                    col = 'rgba(255, 141, 0, 0.43)'
                                    break
                                case 2:
                                    col = 'rgba(255, 141, 0, 0.39)'
                                    break
                                case 3:
                                    col = 'rgba(255, 141, 0, 0.35)'
                                    break
                            }
                        }

                        var tr_style = "left, " + col + " " + perc + "%, transparent 0%"
                        tr_style = "background: -webkit-linear-gradient(" + tr_style + ");background: -moz-linear-gradient(" + tr_style + ");background: -ms-linear-gradient(" + tr_style + ");background: linear-gradient(" + tr_style + ")"

                        var u = getUserFromId(player_user_id)

                        result_html += `
                                <tr style="` + tr_style + `">
                                <td style="width: 15px;">` + rank + `°</td>
                                <td style="min-width: 45px;">#` + player.leaderboard_rank + `</td>
                                <td style="width: 100%;">` + leaderboardRankToTierImage(player.leaderboard_rank) + ` ` + getProfileImage(u) + ` ` + u.username + ` v` + player.version + `</td>
                                <td style="text-align: right">` + formatNumber(player_score) + `</td>
                                </tr>
                            `
                    }
                }

                var d = new Date(game.time_played)

                var row = $(`
                        <tr data-game-id="` + game.game_id + `">
                            <td>
                                <a href="https://halite.io/play?game_id=` + game.game_id + `" target="_blank">` + d.toLocaleString() + `</a><br>
                                <time class="timeago" datetime="` + d.toISOString() + `"></time>
                            </td>
                            <td style="padding: 10px 0;"><table class="result-table">` + result_html + `</table></td>
                            <td>` + game.map_size + "x" + game.map_size + `</td>
                            <td>` + game.turns + `</td>
                        </tr>
                    `)

                // display row

                while ($("#game-feed-" + name).children().length > limit)
                    $("#game-feed-" + name).children().last().remove()
                if (!first) row.hide()
                $("#game-feed-" + name).prepend(row)
                if (!first) row.fadeIn(1000)

                game_feed_last_game[user] = game

                $("time.timeago").timeago()
            }

        }
    })
}

// Live Leaderboard
function updateLiveLeaderboard() {
    for (var user of users) {

        var name = user_name(user)

        if (!live_leaderboard_last_load[user] || (new Date()).getTime() - live_leaderboard_last_load[user] > leaderboard_interval) {
            if (!live_leaderboard_loading[user]) {
                live_leaderboard_loading[user] = true
                refreshLiveLeaderboard(user)
            }
        }

        if (live_leaderboard_loading[user]) {
            $("#leaderboard-status-" + name).html("Updating...")
        } else {
            $("#leaderboard-status-" + name).html((((leaderboard_interval - ((new Date()).getTime() - live_leaderboard_last_load[user]))) / 1000.0).toFixed(2))
        }

        var finalsBegin = new Date("2019-01-22 23:59:59 EST")
        var finalsEnd = new Date("2019-01-29 11:59:59 EST")

        if (new Date() < finalsBegin) {
            $("#finals-status").html('Finals Begins in <time class="timeago" datetime="' + finalsBegin.toISOString() + '"></time>')
        } else if (new Date() < finalsEnd) {
            $("#finals-status").html('Finals Ends in <time class="timeago" datetime="' + finalsEnd.toISOString() + '"></time>')
        } else {
            $("#finals-status").html('Closed')
        }

        $("time.timeago").timeago()
    }
    updateRanks()
    setTimeout(updateLiveLeaderboard, leaderboard_interval)
}

function refreshLiveLeaderboard(user) {
    live_leaderboard_loading[user] = true
    $.ajax({
        url: 'api/live_leaderboard?user=' + user,

        dataType: "json",
        success: function (data) {
            var html = ""

            for (var entry of data.leaderboard) {
                var is_selected = entry.user_id == user

                var delta_mu = 0
                var delta_sigma = 0

                if (live_leaderboard_last_data[user]) {
                    var last_entry = live_leaderboard_last_data[user].leaderboard.filter(e => {
                        return e.user_id === entry.user_id
                    })[0]
                    if (last_entry) {
                        delta_mu = entry.mu - last_entry.mu
                        delta_sigma = entry.sigma - last_entry.sigma
                    }
                }

                delta_mu = parseFloat(delta_mu.toFixed(2))
                delta_sigma = parseFloat(delta_sigma.toFixed(2))

                html += `
                        <tr ${is_selected ? 'style="background: #ffa5004d;"' : ''}>
                            <td>#${entry.rank} ${leaderboardRankToTierImage(entry.rank)}</td>
                            <td data-user-id="` + entry.user_id + `" style="text-align: left">
                                <img class="profile-pic"></img>
                                <span class="username"></span>
                            </td>
                            <td>${entry.rating.toFixed(2)}</td>
                            <td><b>${entry.mu.toFixed(2)}</b>${delta_mu != 0 ? ' <span style="color:' + (delta_mu > 0 ? 'lime' : '#ff5050') + '">(' + (delta_mu > 0 ? '+' : '') + delta_mu + ')</span>' : ''}</td>
                            <td><b>${entry.sigma.toFixed(2)}</b>${delta_sigma != 0 ? ' <span style="color:#a8a8ff">(' + (delta_sigma > 0 ? '+' : '') + delta_sigma + ')</span>' : ''}</td>
                            <td>${entry.games.toLocaleString()}</td>
                        </tr>
                    `
            }
            var name = user_name(user)
            var lb = "#live-leaderboard-" + name
            $(lb).html(html)
            //updateRanks()

            live_leaderboard_last_data[user] = data
            live_leaderboard_last_load[user] = new Date()
            live_leaderboard_loading[user] = false
        }
    })
}

// Finals
function updateFinals() {
    refreshFinals()
    setTimeout(updateFinals, finals_interval)
}

function refreshFinals() {
    $.ajax({
        url: "api/finals",
        dataType: "json",
        success: function (t) {
            var submissions_open = t.submissions_open
            var submission_string = submissions_open ? "OPEN" : "CLOSED"
            var matchmaking = t.finals_pairing
            var matchmaking_string = matchmaking ? "IN PROGRESS" : "CLOSED"
            var finals_games
            var next_cutoff
            var games_to_next
            var next_start
            var current_cutoff
            var schedule = Array()
            var cutoff_schedule = t.cutoff_schedule
            var last_open_game = t.last_open_game
            last_open_game ? finals_games = t.current_game - last_open_game : finals_games = 0
            for (let e = 0; e < cutoff_schedule.length; e++) {
                let n = {}
                e < cutoff_schedule.length - 1 ?
                    (n.start_rank = cutoff_schedule[e + 1][1] + 1, n.end_game = cutoff_schedule[e + 1][0])
                    : (n.start_rank = 1, n.end_game = null),
                    n.start_game = cutoff_schedule[e][0],
                    n.end_rank = cutoff_schedule[e][1],
                    schedule.push(n)
            }
            if (finals_games > 0)
                for (const t of schedule) {
                    if (t.start_game > finals_games) {
                        next_cutoff = t.end_rank
                        next_start = t.start_game
                        games_to_next = t.start_game - finals_games
                        break
                    }
                    current_cutoff = t.end_rank
                }
            else
                current_cutoff = schedule[0].end_rank,
                    next_cutoff = schedule[1].end_rank,
                    games_to_next = schedule[1].start_game

            schedule.reverse()

            var table = $("#finals-table")
            table.html("")
            var html = $(`<tbody>
                                        <tr>
                                            <td style="width:50%;text-align:center;">
                                                <h2>CURRENT COMPETITION STATUS</h2>
                                                <p><strong>Submissions:</strong>${submission_string}</p>
                                                <p><strong>Matchmaking:</strong>${matchmaking_string}, ${finals_games} PLAYED</p>
                                                <p><strong>Ranks Currently Playing:</strong>1-${current_cutoff}</p>
                                            </td>
                                            <td style="width:50%;text-align:center;">
                                                <h2>GAME PROGRESS</h2>
                                                <p>The most recent game played is <a href="https://halite.io/play?game_id=${last_open_game}">${last_open_game}</a></p>
                                                <p>Ranks ${next_cutoff + 1}-${current_cutoff} will be eleminated in ${games_to_next} games.</p>
                                                 <p>Finals end January 29th, 11:59:59AM EST.</p>
                                            </td>
                                        </tr>
                                    </tbody>`)

            table.html(html)
        }
    })
}
