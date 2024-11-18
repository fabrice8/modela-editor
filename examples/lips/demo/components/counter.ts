import type { Handler } from '../../../../src/component'

export type Input = {
  initial: number
}
type Static = {
  limit: number
}
type State = {
  count: number
}

export const _static: Static = {
  limit: 12
}

export const context = ['lang']

export const state: State = {
  count: 0
}

export const handler: Handler<Input, State, Static> = {
  // onCreate(){ this.state.count = Number( this.input.initial ) },
  onInput(){ this.state.count = Number( this.input.initial ) },
  handleClick( e ){
    if( this.state.count >= this.static.limit )
      return

    this.state.count++
    this.emit('update', this.state.count )
  }
}

export const stylesheet = `
  span { font: 14px arial; color: blue; }
`
  
export default `<div>
  <span html=this.input.__innerHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`