/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const IPFS = require('ipfs')
const each = require('async/each')
const clone = require('lodash.clonedeep')

const Room = require('../')
const createRepo = require('./utils/create-repo-node')

const topic = 'pubsub-room-test'

const ipfsOptions = {
  config: {
    Addresses: {
      Swarm: [
        '/libp2p-webrtc-star/dns4/star-signal.cloud.ipfs.team/wss'
      ]
    },
    Discovery: {
      webRTCStar: {
        Enabled: true
      }
    }
  },
  EXPERIMENTAL: {
    pubsub: true
  }
}

describe('sync', () => {
  const repos = []
  let node1, node2
  let id1, id2
  let room1, room2

  before((done) => {
    const repo = createRepo()
    repos.push(repo)
    const options = Object.assign({}, clone(ipfsOptions), {
      repo: repo
    })
    node1 = new IPFS(options)
    node1.once('ready', () => {
      node1.id((err, info) => {
        expect(err).to.not.exist()
        id1 = info.id
        done()
      })
    })
  })

  before((done) => {
    const repo = createRepo()
    repos.push(repo)
    const options = Object.assign({}, clone(ipfsOptions), {
      repo: repo
    })
    node2 = new IPFS(options)
    node2.once('ready', () => {
      node2.id((err, info) => {
        expect(err).to.not.exist()
        id2 = info.id
        done()
      })
    })
  })

  after((done) => each(repos, (repo, cb) => repo.teardown(cb), done))

  it('can create a room, and they find each other', (done) => {
    room1 = Room(node1, topic)
    room2 = Room(node2, topic)
    let left = 2
    room1.once('peer joined', (id) => {
      expect(id).to.equal(id2)
      if (--left === 0) {
        done()
      }
    })
    room2.once('peer joined', (id) => {
      expect(id).to.equal(id1)
      if (--left === 0) {
        done()
      }
    })
  })

  it('has peer', (done) => {
    expect(room1.getPeers()).to.deep.equal([id2])
    expect(room2.getPeers()).to.deep.equal([id1])
    done()
  })

  it('can broadcast', (done) => {
    room1.broadcast('message 1')
    room2.once('message', (message) => {
      expect(message.from).to.equal(id1)
      expect(message.data.toString()).to.equal('message 1')
      done()
    })
  })
})
