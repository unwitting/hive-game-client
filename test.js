const _ = require('lodash')
const { log } = require('peasy-log')
const { Move, Board } = require('hive-game-core')
const { Client } = require('./client')

class BotClient extends Client {

  randomPiece(pieces) { return pieces[_.random(0, pieces.length - 1)] }

  move(gameState) {
    const potentialMoves = this._getAllPossibleMoves(gameState)
    const board = new Board({ state: gameState.board })
    log(`I have ${potentialMoves.length} moves available for turn ${gameState.turn}`)
    const queenAttackingOnly = _.reject(potentialMoves, moveString => {
      const move = new Move(moveString)
      if (!move.isMovement) { return false }
      if (!board.isAdjacentToPiece(move.movementTargetCoords, 'Q', !this._getMe(gameState).white)) { return true }
      if (board.isAdjacentToPiece(move.movementOriginCoords, 'Q', !this._getMe(gameState).white)) { return true }
      return false
    })
    log(`${queenAttackingOnly.length} of those are queen-attacking or placement moves`)
    const moveSet = queenAttackingOnly.length ? queenAttackingOnly : potentialMoves
    const move = moveSet[_.random(moveSet.length - 1)]
    return move
  }

}

async function test() {
  const botA = new BotClient()
  const botB = new BotClient()
  while (true) {
    try {
      if (botA._games.length < 5) { await botA.joinFreeGame() }
      if (botB._games.length < 5) { await botB.joinFreeGame() }
      await botA.processOneMove()
      await botB.processOneMove()
    } catch(e) { console.error(e) }
  }
}

test()
