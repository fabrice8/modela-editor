import { obj2Str, str2Obj } from '../modules/utils'

export type PeerType = 'WINDOW' | 'IFRAME'

export type CallbackFunction = ( error: boolean | string, ...args: any[] ) => void
export type Listener = ( payload?: any, callback?: CallbackFunction ) => void

export type Options = {
  type?: PeerType
  // debug?: boolean
}

export interface RegisteredEvents {
  [index: string]: Listener[]
}

export type Peer = {
  type: PeerType
  source?: Window
  origin?: string
}

export type MessageData = {
  _event: string
  payload: any
  cid: boolean
}

export type Message = {
  origin: string
  data: MessageData,
  source: Window
}

const callbackId = () => {
  const rmin = 10, rmax = 9999
  return Date.now() + String( Math.floor( Math.random() * ( rmax - rmin + 1 )+( rmin + 1 ) ) )
}

export default class IOF {
  Events: RegisteredEvents
  peer: Peer
  options: Options

  constructor( options: Options ){
    if( options && typeof options !== 'object' )
      throw new Error('Invalid Options')
    
    this.options = options
	  this.Events = {}
    this.peer = { type: 'IFRAME' }

    if( options.type ) 
      this.peer.type = options.type.toUpperCase() as PeerType
  }

  debug( ...args: any[] ){ console.debug( ...args ) }

  initiate( contentWindow: MessageEventSource, iframeOrigin: string ){
    // Establish a connection with an iframe containing in the current window
    if( !contentWindow || !iframeOrigin )
      throw new Error('Invalid Connection initiation arguments')
    
    if( this.peer.type === 'IFRAME' )
      throw new Error('Expect IFRAME to <listen> and WINDOW to <initiate> a connection')

    this.peer.source = contentWindow as Window
    this.peer.origin = iframeOrigin

    window.self.addEventListener('message', ({ origin, data, source, target }) => {
      // Check valid message
      if( origin !== this.peer.origin
          || !source
          || source !== this.peer.source
          || typeof data !== 'object'
          || !data.hasOwnProperty('_event') ) return
      
      const { _event, payload, cid } = data as Message['data']
      // this.debug( `[${this.peer.type}] Message: ${_event}`, payload || '' )

      // Handshake or availability check events
      if( _event === 'handshake' ){
        // Content Window is connected to iframe
        this.fire('connect')
        this.debug(`[${this.peer.type}] connected`)
      }
      // Fire available event listeners
      else this.fire( _event, payload, cid )
    }, false )

    this.debug(`[${this.peer.type}] Initiate connection: IFrame origin <${iframeOrigin}>`)
    this.emit('handshake')

    return this
  }

  listen( hostOrigin?: string ){
    // Listening to connection from the content window
    this.peer.type = 'IFRAME' // iframe.io connection listener is automatically set as IFRAME
    this.debug(`[${this.peer.type}] Listening to connect${hostOrigin ? `: Host <${hostOrigin}>` : ''}`)

    window.addEventListener('message', ({ origin, data, source }) => {
      // Check host origin where event must only come from.
      if( hostOrigin && hostOrigin !== origin )
        throw new Error('Invalid Event Origin')

      // Check valid message
      if( !source
          || typeof data !== 'object'
          || !data.hasOwnProperty('_event') ) return

      // Define peer source window and origin
      if( !this.peer.source ){
        this.peer = { ...this.peer, source: source as Window, origin }
        this.debug(`[${this.peer.type}] Connect to ${origin}`)
      }

      // Origin different from handshaked source origin
      else if( origin !== this.peer.origin )
        throw new Error('Invalid Origin')
      
      const { _event, payload, cid } = data
      // this.debug( `[${this.peer.type}] Message: ${_event}`, payload || '' )

      // Handshake or availability check events
      if( _event === 'handshake' ){
        this.emit('handshake')
        // Iframe is connected to content window
        this.fire('connect')
        this.debug(`[${this.peer.type}] connected`)
      }
      // Fire available event listeners
      else this.fire( _event, payload, cid )
    }, false )

    return this
  }

  fire( _event: string, payload?: MessageData['payload'], cid?: boolean ){
    // Volatile event
    if( !this.Events[ _event ] 
        && !this.Events[ _event +'--@once'] )
      return this.debug(`[${this.peer.type}] No <${_event}> listener defined`)

    let callbackFn: ( error: boolean | string, ...args: any[] ) => void
    if( cid )
      callbackFn = ( error, ...args ) => {
        let [_ev, once] = _event.split('--@once')
        _ev = once !== undefined ? 
            `${_ev}--${cid}--@callback--@once`
            : `${_ev}--${cid}--@callback` 

        this.emit( _ev, { error: error || false, args } )
        return
      }

    let listeners: Listener[] = []
    if( this.Events[`${_event}--@once`] ){
      // Once triggable event
      _event += '--@once'
      listeners = this.Events[ _event ]
      // Delete once event listeners after fired
      delete this.Events[ _event ]
    }
    else listeners = this.Events[ _event ]
    
    // Convert object payload to
    // if( payload && typeof payload == 'string' )
    //   try { payload = str2Obj( payload ) }
    //   catch( error ){}

    // Fire listeners
    listeners.map( fn => payload !== undefined ? fn( payload, callbackFn ) : fn( callbackFn ) )
  }

  emit( _event: string, payload?: MessageData['payload'], fn?: CallbackFunction ){
    if( !this.peer.source )
      throw new Error('No Connection initiated')

		if( typeof payload == 'function' ){
			fn = payload
			payload = undefined
		}

    // Acknowledge/callback event listener
    let cid
    if( typeof fn === 'function' ){
      const callbackFunction = fn

      cid = callbackId()
		  this.once(`${_event}--${cid}--@callback`, ({ error, args }) => callbackFunction( error, ...args ) )
    }
    
    // if( payload && typeof payload == 'object' && !Array.isArray( payload ) )
    //   payload = obj2Str( payload )
    
    this.peer.source.postMessage({ _event, payload, cid }, this.peer.origin as string )

		return this
  }
  
  on( _event: string, fn: Listener ){
		// Add Event listener
		if( !(_event in this.Events) ) this.Events[ _event ] = []
		this.Events[ _event ].push( fn )
    
    this.debug(`[${this.peer.type}] New <${_event}> listener on`)
		return this
	}
  
  once( _event: string, fn: Listener ){
		// Add Once Event listener
    _event += '--@once'

		if( !(_event in this.Events) ) this.Events[ _event ] = []
		this.Events[ _event ].push( fn )
    
    this.debug(`[${this.peer.type}] New <${_event} once> listener on`)
		return this
	}

	off( _event: string, fn?: Listener ){
		// Remove Event listener
		delete this.Events[ _event ]
		typeof fn == 'function' && fn()
    
    this.debug(`[${this.peer.type}] <${_event}> listener off`)
		return this
	}

	removeListeners( fn?: Listener ){
    // Clear all event listeners
		this.Events = {}
		typeof fn == 'function' && fn()

    this.debug(`[${this.peer.type}] All listeners removed`)
		return this
	}
}