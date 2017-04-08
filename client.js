const _ = require('lodash')
const { log } = require('peasy-log')
const { Board } = require('hive-game-core')
const request = require('request-promise-native')
const uuid = require('uuid/v4')

const GAME_HOST = 'http://packhorse:8000'

class Client {

  constructor() {
    this._id = uuid()
    this._games = []
  }

  getMe(gameState) {
    return _.find(gameState.players, p => p.id === this._id)
  }

  getMyPieces(gameState) {
    return this.getMe(gameState).pieces
  }

  log(s) { log(`${this._id} ${s}`) }

  async joinFreeGame() {
    this.log(`_Joining free game_`)
    const { token } = await this._request(`${GAME_HOST}/game/free`)
    this.log(`_Joined_ free game with token **${token}**`)
    this._games.push(token)
    return token
  }

  async processOneMove() {
    this.log(`_Processing one move_`)
    const statuses = await Promise.all(_.map(this._games, token => this._request(`${GAME_HOST}/game/status/${token}`)))
    this.log(`_Got statuses_ for **${statuses.length}** games`)
    const statusesToMove = _.filter(statuses, s => {
      if (!s.state) { return false }
      if (s.state.gameOver) {
        this._games = _.reject(this._games, token => token === s.token)
        this.log(`_Game over_ for game **${s.token}**, removing from my list`)
        return false
      }
      return s.state.toMove === this._id
    })
    this.log(`_Found_ **${statusesToMove.length}** games waiting for my move`)
    if (statusesToMove.length === 0) { return }
    const chosenGame = statusesToMove[_.random(statusesToMove.length - 1)]
    const move = this.move(chosenGame.state)
    await this._request(`${GAME_HOST}/game/${chosenGame.token}/move/${move}/${chosenGame.hash}`)
  }

  move(gameState) { throw 'move() not implemented' }

  async _request(url) {
    return await request(url, { headers: { 'X-Player-ID': this._id }, json: true })
  }

}

module.exports = { Client }
