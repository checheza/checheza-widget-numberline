import { Widget } from 'checheza_core';
import Manifest from './manifest';
import MainDomain from './domains/main';

class ExampleWidget extends Widget {
    constructor() {
        super(Manifest);
        
        // These are all the different domains in your widget. The domains can be referred to views and logic.
        // A domain called "main" always has to exist in a widget, as this is called when a widget is started.
        this.domains = { 
            "main": new MainDomain(this),
        }
    }
}

export default new ExampleWidget();
