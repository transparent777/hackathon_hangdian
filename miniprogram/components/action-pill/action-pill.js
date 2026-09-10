Component({
  properties: {
    variant: {
      type: String,
      value: 'primary'
    },
    text: {
      type: String,
      value: ''
    },
    loadingText: {
      type: String,
      value: ''
    },
    icon: {
      type: String,
      value: ''
    },
    disabled: {
      type: Boolean,
      value: false
    },
    loading: {
      type: Boolean,
      value: false
    },
    openType: {
      type: String,
      value: ''
    }
  },

  methods: {
    onTap() {
      if (this.data.disabled || this.data.loading) return
      if (this._tapLocked) return

      this._tapLocked = true
      setTimeout(() => {
        this._tapLocked = false
      }, 500)

      this.triggerEvent('tap')
    }
  }
})
