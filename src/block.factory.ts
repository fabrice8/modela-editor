
import {
  VIEW_REF_SELECTOR,
  VIEW_CONTROL_OPTIONS,
  VIEW_PLACEHOLDER_SELECTOR,

  CONTROL_PANEL_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_FLOATING_SELECTOR,

  GLOBAL_CONTROL_OPTIONS,

  FORM_INPUT_SELECTOR,
  FORM_SEPERATOR_SELECTOR,
} from './constants'
import { generateKey } from './utils'

/**
 * UI blocks factory
 */
export const createGlobalControlBlock = () => {
  const globalTabs = `<ul options="tabs">
    <li show="global" target="settings"><i class="bx bx-cog"></i></li>
    <li show="global" target="styles"><i class="bx bxs-brush"></i></li>
    <li show="global" target="assets"><i class="bx bx-landscape"></i></li>
    <li dismiss="global"><i class="bx bx-x"></i></li>
  </ul>`,
  globalBody = `<div>

  </div>`
  
  return `<div class="modela-global">
    ${createToolbar('global', GLOBAL_CONTROL_OPTIONS )}
    
    <div mv-control-block="global">
      ${globalTabs}
      ${globalBody}
    </div>
  </div>`
}

export const createStoreControlBlock = () => {
  const
    storeBlock = `<div mv-control-block="store">
    </div>`
    
    /**
     * 
     */
    return `<div class="modela-store">
      <span show="store"><i class="bx bx-dots-vertical-rounded"></i></span>

      ${storeBlock}
    </div>`
}

/**
 * Process toolbar options into HTML content
 */
export const createToolbar = ( key: string, options: ToolbarSet[], editing = false ) => {
  if( typeof key !== 'string' 
      || !Array.isArray( options ) 
      || !options.length )
    throw new Error('Invalid createToolbar Arguments')

  let 
  mainOptions = '',
  extraOptions = '',
  subOptions: string[] = []

  const
  composeSubLi = ({ icon, title, event, disabled }: ToolbarSet ) => {
    let attrs = `${disabled ? 'class="disabled"' : ''}`
    
    // Trigger event type & params attributes
    if( event ){
      if( event.type && event.attr ) attrs += ` ${event.type}="${event.attr}"`
      if( event.params ) attrs += ` params="${event.params}"`
    }

    // Add title attributes
    if( title ) attrs += ` title="${title}"`

    return `<li ${attrs}><i class="${icon}"></i></li>`
  },
  composeLi = ({ icon, label, title, event, disabled, extra, sub, meta }: ToolbarSet ) => {
    let attrs = `${disabled ? 'class="disabled"' : ''}`
    
    // Trigger event type & params attributes
    if( event ){
      if( event.type && event.attr ) attrs += ` ${event.type}="${event.attr}"`
      if( event.params ) attrs += ` params="${event.params}"`

      // Create a sub options
      if( Array.isArray( sub ) && sub.length )
        subOptions.push(`<div options="sub" extends="${event.params}">
                          <li dismiss="sub"><i class="bx bx-chevron-left"></i></li>
                          <li class="label"><i class="${icon}"></i><label>${label || title}</label></li>
                          ${sub.map( composeSubLi ).join('')}
                        </div>`)
    }

    // Add title attributes
    if( meta ) attrs += ` meta`
    if( label ) attrs += ` class="label"`
    if( title ) attrs += ` title="${title}"`

    const optionLi = `<li ${attrs}><i class="${icon}"></i><label>${label ? ` ${label}` : ''}</label></li>`
    extra ?
        extraOptions += optionLi
        : mainOptions += optionLi
  }
  
  /**
   * Attach meta options to every editable view.
   */
  const
  metaOptions = VIEW_CONTROL_OPTIONS.filter( each => (each.meta) ),
  detachedOptions = VIEW_CONTROL_OPTIONS.filter( each => (each.detached) )

  if( editing && Array.isArray( metaOptions ) && metaOptions.length )
    options = [ ...options, ...metaOptions ]

  // Generate HTML menu
  options.forEach( composeLi )

  if( !mainOptions )
    throw new Error('Undefined main options')

  return `<div ${CONTROL_TOOLBAR_SELECTOR}="${key}" ${editing ? 'class="editing"' : ''}>
    <div container>
      <ul>
        <div options="main">
          ${mainOptions}
          ${extraOptions ? `<li toggle="extra"><i class="bx bx-dots-horizontal-rounded"></i></li>` : ''}
        </div>

        ${ extraOptions ?
              `<div options="extra">
                ${extraOptions}
                <li dismiss="extra"><i class="bx bx-chevron-left"></i></li>
              </div>` : ''
        }

        ${subOptions.length ? subOptions.join('') : ''}
      </ul>

      ${ editing && Array.isArray( detachedOptions ) && detachedOptions.length ? 
            `<ul>
              <div options="control">
                ${detachedOptions.map( composeSubLi ).join('')}
              </div>
            </ul>`: ''
      }
    </div>
  </div>`
}

export const createPanel = ( key: string, caption: ViewCaption, options: PanelSections, active?: string ) => {
  if( !options || !Object.keys( options ).length )
    throw new Error('Invalid createPanel options')

  let
  sectionTabs = '',
  sectionBodies = ''

  const composeSection = ( name: string, { icon, fieldsets, listsets }: PanelSet, isActive: boolean ) => {
    /**
     * List of tabs
     */
    sectionTabs += `<li tab="${name}" ${isActive ? 'class="active"' : ''}><i class="${icon}"></i></li>`

    let fieldsetHTML = ''
    fieldsets?.map( ({ label, fields, seperate }) => {
      // Do not render empty fieldset
      if( !Array.isArray( fields ) || !fields.length )
        return
      
      fieldsetHTML += `<fieldset>
        ${label ? `<label>${label}</label>` : ''}
        ${fields.map( each => (createInput( each )) ).join('')}
      </fieldset>`

      // Add seperator to this block
      if( seperate )
        fieldsetHTML += createFormSeperator()
    } )

    let listsetHTML = ''
    listsets?.map( ({ label, items, seperate }) => {
      // Do not render empty list
      if( !Array.isArray( items ) || !items.length )
        return
      
      listsetHTML += `<div class="listset">
        ${label ? `<label>${label}</label>` : ''}
        <ul>${items.map( each => (createListItem( each )) ).join('')}</ul>
      </div>`

      // Add seperator to this block
      if( seperate )
        listsetHTML += createFormSeperator()
    } )

    sectionBodies += `<div section="attributes" class="active">
      ${fieldsetHTML}
      ${listsetHTML}
    </div>`
  }

  /**
   * Generate HTML content of panel sections
   */
  Object.entries( options ).map( ( [name, section], index ) => composeSection( name, section, active == name || index === 0) )

  return `<div ${CONTROL_PANEL_SELECTOR}="${key}">
    <div dismiss="self" backdrop></div>
    <div container>
      <div class="label">
        <i class="${caption.icon}"></i>
        <label>${caption.title}</label>

        <!-- Dismiss control panel -->
        <span dismiss="self"><i class="bx bx-x"></i></span>
      </div>

      <ul options="tabs">${sectionTabs}</ul>
      <div class="body">${sectionBodies}</div>
    </div>
  </div>`
}

export const createFloating = ( key: string, type: 'view' | 'layout', triggers: string[], update = false ) => {
  if( !Array.isArray( triggers ) || !triggers.length )
    throw new Error('Undefined triggers list')

  let list = ''
  triggers.map( each => {
    switch( each ){
      case 'addpoint': list += `<li action="add" params="${type}"><i class="bx bx-plus"></i></li>`; break
      case 'paste': list += `<li action="paste" params="${type}"><i class="bx bx-paste"></i></li>`; break
    }
  } )

  return update ? `<ul>${list}</ul>` : `<div ${CONTROL_FLOATING_SELECTOR}="${key}"><ul>${list}</ul></div>`
}

/**
 * Create common placeholder block
 */
export const createPlaceholder = ( key?: string ) => {
  return `<div ${VIEW_PLACEHOLDER_SELECTOR}="${generateKey()}" ${VIEW_REF_SELECTOR}="${key}" status="active"></div>`
}

export const createInput = ({ type, label, name, value, pattern, placeholder, options, range, disabled }: InputOptions ) => {

  const id = `input-${type}-${label.toLowerCase().replace(/\s+/, '-')}`

  switch( type ){
    case 'text': {
      return `<div ${FORM_INPUT_SELECTOR}="${type}">
        <!--<label for="${id}">${label}</label>-->
        <input id="${id}"
                type="${type}"
                name="${name}"
                ${label ? `title="${label}"`: ''}
                ${value ? `value="${value}"`: ''}
                ${disabled ? `disabled="true"`: ''}
                ${pattern ? `pattern="${pattern}"`: ''}
                ${placeholder || label ? `placeholder="${placeholder || label}"`: ''}>
      </div>`
    }

    case 'checkbox': {
      return `<div ${FORM_INPUT_SELECTOR}="${type}">
        <input id="${id}"
                type="${type}"
                name="${name}"
                ${disabled ? `disabled="true"`: ''}
                ${value ? `checked="true"`: ''}>
        <label for="${id}">${label}</label>
      </div>`
    }
  }
}

export const createFormSeperator = ( options?: SeperatorOptions ) => {
  return `<div ${FORM_SEPERATOR_SELECTOR}></div>`
}

export const createListItem = ({ icon, title, value, event, sub, disabled }: ListItem ) => {
  let attrs = `${disabled ? 'class="disabled"' : ''}`
  
  // Trigger event type & params attributes
  if( event ){
    if( event.type && event.attr ) attrs += ` ${event.type}="${event.attr}"`
    if( event.params ) attrs += ` params="${event.params}"`
  }

  return `<li ${attrs}>
    <i class="${icon}"></i>
    <span>${title}</span>
    ${value ? `<span class="value">${value}</span>` : ''}

    ${sub ? `<span class="sub-arrow"><i class="bx bx-chevron-right"></i></span>` : ''}
  </li>`
}