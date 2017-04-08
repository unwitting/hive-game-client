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

  async joinFreeGame() {
    log(`_Joining free game_`)
    const { token } = await this._request(`${GAME_HOST}/game/free`)
    log(`_Joined_ free game with token **${token}**`)
    this._games.push(token)
    return token
  }

  async processOneMove() {
    log(`_Processing one move_`)
    const statuses = await Promise.all(_.map(this._games, token => this._request(`${GAME_HOST}/game/status/${token}`)))
    log(`_Got statuses_ for **${statuses.length}** games`)
    const statusesToMove = _.filter(statuses, s => {
      if (!s.state) { return false }
      if (s.state.gameOver) {
        this._games = _.reject(this._games, token => token === s.token)
        log(`_Game over_ for game **${s.token}**, removing from my list`)
        return false
      }
      return s.state.toMove === this._id
    })
    log(`_Found_ **${statusesToMove.length}** games waiting for my move`)
    if (statusesToMove.length === 0) { return }
    const chosenGame = statusesToMove[_.random(statusesToMove.length - 1)]
    const move = this.move(chosenGame.state)
    await this._request(`${GAME_HOST}/game/${chosenGame.token}/move/${move}/${chosenGame.hash}`)
  }

  move(gameState) {
    throw 'move() not implemented'
  }

  _getAllPossibleMoves(gameState) {
    const potentialMoves = []
    const myPieces = this._getMyPieces(gameState)
    const board = new Board({ state: gameState.board })

    if (myPieces.length) {
      const validPlacementLocations = board.getValidPlacementLocations(gameState.turn)
      if (validPlacementLocations.length) {
        for (const coords of validPlacementLocations) {
          for (const piece of _.uniqBy(myPieces)) {
            potentialMoves.push(`${piece}+${coords.join(',')}`)
          }
        }
      }
    }

    const playedPieces = board.piecesPlaced[this.white ? 'white': 'black']
    for (const {piece, coords3} of playedPieces) {
      for (const movementTarget of board.getValidMovementTargets(coords3, gameState.turn)) {
        potentialMoves.push(`${piece}[${coords3.join(',')}]>${movementTarget.join(',')}`)
      }
    }

    return potentialMoves
  }

  _getMe(gameState) {
    return _.find(gameState.players, p => p.id === this._id)
  }

  _getMyPieces(gameState) {
    return this._getMe(gameState).pieces
  }

  async _request(url) {
    return await request(url, { headers: { 'X-Player-ID': this._id }, json: true })
  }

}

module.exports = { Client }
