const _ = require('lodash')
const { log } = require('peasy-log')
const { Board } = require('hive-game-core')
const request = require('request-promise-native')
const uuid = require('uuid/v4')

const GAME_HOST = 'http://localhost:8000'

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
    const { gameId } = await this._request(`${GAME_HOST}/game/new`)
    this.log(`_Joined_ free game with gameId **${gameId}**`)
    this._games.push(gameId)
    return gameId
  }

  async processOneMove() {
    this.log(`_Processing one move_`)
    const statuses = await Promise.all(_.map(this._games, gameId => this._request(`${GAME_HOST}/game/${gameId}/status`)))
    this.log(`_Got statuses_ for **${statuses.length}** games`)
    const toRemove = []
    const statusesToMove = _.filter(statuses, s => {
      if (s.status === 'NONEXISTENT') {
        toRemove.push(s.gameId)
        this.log(`_Something went wrong_ and the server seems not to know about game **${s.gameId}**, removing from my list`)
      }
      if (!s.state) { return false }
      if (s.status === 'COMPLETED' || s.state.gameOver) {
        toRemove.push(s.gameId)
        this.log(`_Game over_ for game **${s.gameId}**, removing from my list`)
        return false
      }
      return s.state.toMove === this._id
    })
    this._games = _.reject(this._games, gameId => _.includes(toRemove, gameId))
    this.log(`_Found_ **${statusesToMove.length}** games waiting for my move`)
    if (statusesToMove.length === 0) { return }
    const chosenGame = statusesToMove[_.random(statusesToMove.length - 1)]
    const move = this.move(chosenGame.state)
    await this._request(`${GAME_HOST}/game/${chosenGame.gameId}/move/${move}/${chosenGame.hash}`)
  }

  move(gameState) { throw 'move() not implemented' }

  async _request(url) {
    return await request(url, { headers: { 'X-Player-ID': this._id }, json: true })
  }

}

module.exports = { Client }
