{
  "targets": [
    {
      "target_name": "mac_input",
      "sources": ["input.mm"],
      "conditions": [
        ["OS=='mac'", {
          "xcode_settings": {
            "CLANG_ENABLE_OBJC_ARC": "YES",
            "MACOSX_DEPLOYMENT_TARGET": "12.0",
            "OTHER_CPLUSPLUSFLAGS": ["-std=c++17", "-fobjc-arc"]
          },
          "link_settings": { "libraries": ["-framework AppKit"] }
        }]
      ]
    }
  ]
}
