/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//= require ./gum

const {
  palava
} = this;

palava.Identity = class Identity {
  constructor(o) {
    this.getName = this.getName.bind(this);
    this.getStatus = this.getStatus.bind(this);
    this.userMediaConfig = o.userMediaConfig;
    this.status       = o.status || {};
    this.status.name  = o.name;
  }

  newUserMedia() {
    return new palava.Gum(this.userMediaConfig);
  }

  getName() {
    return this.name;
  }

  getStatus() {
    return this.status;
  }
};
