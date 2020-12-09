# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [5.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/5.1.2...5.2.0) (2020-12-08)


### Features

* **casparcg:** FFMpeg filter strings for audio and video ([4f332a7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4f332a73ff8235031bbbc8108679f90abd645e03))
* add support for running internal transitions for casparCG ([4b0443c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4b0443c8fbcd804802df2afab7613619cb26071d))
* continued implementation of internal transitions. add support for MIX, PERSPECTIVE and a hack to combinate with opacity and volume [publish] ([c424637](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c424637b81f4eb11286ec2b876685a6f94d30190))
* set casparcg fps in device options ([e2a15b5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e2a15b5a85698d9d3f2db756b8f582a7a2644b34))


### Bug Fixes

* add getThreadsMemoryUsage method, for troubleshooting memory issues ([091f9da](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/091f9da28d22b7c89000daeb23c9f9dd94bf2e2a))
* don't delete property which is not optional ([5617750](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/561775063cdadebdee82940d5ea2a8af50be177e))
* transition properties should be optional ([2d2fb87](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2d2fb87f831eca85dbf38a75d0ee22216d27c753))
* update threadedclass dependency to 0.8.1 ([1bf2d5a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1bf2d5aeb894a7b251df8ed572e2a3fc838476fb))
* wrong prop value ([dd5ff81](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dd5ff81ff0e20f26a8525e20db0809f6fca3334d))

### [5.1.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/5.1.1...5.1.2) (2020-11-10)


### Bug Fixes

* **casparcg:** allow transitions to be defined on html pages [publish] ([492901b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/492901be44d37e117788e8caf7ec8a09f744986a))

### [5.1.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/5.1.0...5.1.1) (2020-10-19)


### Bug Fixes

* update timeline dependency (bug fix) ([bcdd34c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bcdd34c8803215d53fd97e1a179761d5ea9a657c))

## [5.1.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/5.0.0...5.1.0) (2020-09-30)


### Features

* update to casparcg-state v2 ([e3a063f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e3a063f15e29645a96cc8a9cd72c9e6d760df2d7))


### Bug Fixes

* **casparcg:** use 25 as channel framerate ([6463ffc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6463ffcb875882e22edad0ede620346b9054cf59))

## [5.0.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/4.0.4...5.0.0) (2020-09-28)


### ⚠ BREAKING CHANGES

* Treat Mappings as dynamic data, the same way we do with timeline.

### Features

* **lawo:** source identifier node ([70be8bc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/70be8bc76384e18ca118800cb14b965205efa616))
* Add audio ([b5d6ea0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b5d6ea01607b0001ad6f6a190de7c6bf0ea61b5d))
* Add commands to play/pause/restart inputs ([9183b34](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9183b3453f62dc2d2c7add74339cc5e3417259fd))
* Add Fade To Black ([b085afa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b085afaf200ba43f3f4c2d9965b97b5dcc4d9b1f))
* Add helper to send an input to program by clip name ([18144f5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/18144f52325098ec68284ee202e9139a3a12ec17))
* Add helpers to start / stop clips by name ([1177d55](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1177d551465c333d2e7f8834781944e694bcdb2c))
* Add output mapping ([0a366d9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0a366d95c236c488ce96d73403a0ea4545a28b34))
* Add overlays ([a3c3641](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a3c3641ee20c84c15884b0f6d805583d7f86dd66))
* Add preview timeline object ([bf42d78](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bf42d788ccaa0e19346354e8d26f724b1806760e))
* Add quick play ([88fd701](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/88fd701822e2fac05459a9192c2ac7e5c284b86d))
* Add SetInputName ([9525c40](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9525c40c4f1f22cfa49094d1d13f188eac550312))
* Add streaming / recording ([5fadd58](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5fadd581ced195881976ff1820d823c0d6be2235))
* Add transition enum ([f10c11d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f10c11d30b3bda7ebde28a6cd6cf0c3f4b3b31ee))
* Add transitions ([98c4302](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/98c4302a74afb00996ff1c433141137561d06d7b))
* Auto load + play images ([de0e9b5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/de0e9b5bdebb4b7bbb126af6eb3a069035dc6c8a))
* Clean up various TODOs ([f1c0e45](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f1c0e452324acf5028e6795436561a978b8bed05))
* Create overlay if it doesn't already exist ([2739f7f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2739f7f8f7764740b2a74d98d222f87e61f186b4))
* devices emit "active"-status, so that an external monitor can choose to ignore non-good statuses of inactive devices ([4fc1ccf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4fc1ccf3d064d402a4f281bcac8c739e1be669b5))
* input (Multi View) overlays ([6dbebf1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6dbebf1d92a88fdaf448480e4f6c0696d6031ab0))
* input looping ([31b5eec](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/31b5eec74957e3f8d371dfd463985ffd2f93141d))
* Input switching ([0f71bf1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0f71bf12f3d3b507addc68715096df88cba1159f))
* input transform ([564acff](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/564acffdd3d39e975ec1339d748c116c57e4f66e))
* input transform interface ([13c4af2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/13c4af2e259ecd6ab259636a28db49ee4c603e77))
* let the conductor emit an event at the end of resolving (used for reporting of latency downstream) ([debd5e1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/debd5e1d37f4e2199ba26ea492b926ce6320d243))
* mappings ([f45584d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f45584d5a87f7f25030a469a8eac73831cee73dd))
* Move type changing to API ([0d47fee](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0d47fee775bdd8f20f3277a7ade3dccef02b732b))
* new timeline interface for vMix device ([08fbdfb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/08fbdfb35cd41566658f0c034225c267e5547602))
* Overlay input by clip name ([5ee8904](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5ee89049f4f33fbcebc09b29a6042fe9f8121bd1))
* Play clip immediately after creation ([64c0a68](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/64c0a68efdb59936c8505966b92423139108848c))
* Remove 'momentary' commands ([b00da7c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b00da7c76950e0d69fd3998b2fab8d34bfe7b2fd))
* Send camera to program ([ce85854](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ce858544131a1ea1a1873abcdaf1e8b4e4be71a9))
* Set fader position ([b616e98](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b616e98300729fdd54e0c0e2af0f000a4eac3cde))
* shotoku support ([d7278f4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d7278f482cb8e963777a22b44922576283d208b6))
* Specify transition button ([b26f0c8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b26f0c83387db1a69dd2feb516f8674b67be1360))
* Start/Stop external output ([9dcc0b6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9dcc0b6ce69c4ed68da9beb93aeb8964734bd7a6))
* switching to program by layer name ([9b1611d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9b1611d7409e66174f1e78d5e988b2dc7fb282d4))
* Track vMix state to allow inputs to be added ([cfe428e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cfe428ea6e3d38071794cf28d6e2c377ae945575))
* Treat Mappings as dynamic data, the same way we do with timeline. ([9eccf6d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9eccf6da2db5affe4a3d6a7f593f4df9a21b5f4b))
* upgrade atem-connection to 2.0 ([998f4e8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/998f4e8153e97137b1bae6e6a142807b937b8260))
* When playing a clip by name, add clip if it doesn't exist ([184c04f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/184c04f97ea3b7e92d21a42135102bbad07d20cd))


### Bug Fixes

* Add missing params in default input state ([76b4bf2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/76b4bf209bcbfc58f61c968bff3fdbc83f20e341))
* Add prepareForHandleState ([ed0c099](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ed0c09925d3b192df6682c4e7d9dcc6cce721f92))
* Add set values to enum ([598fced](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/598fcedee838cf78caf01d6564b61db35507005c))
* assign explicit values to enum ([ace77d3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ace77d3b1bf95e9d6e36e3cd981d9f0d2ca299bd))
* change VIZMSE console.log into emit('debug' ([7100157](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7100157f794c1e2bb6f3dde1730d5e462f3e7507))
* Check for existing input ([3228afc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3228afcf7d21e0ca1a5b08c2d4763370ab1160ad))
* Clear keepalive timeout on dispose ([ce8da47](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ce8da47a3556115b6f952a7c73d8e6165229703e))
* connection and status ([36d977c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/36d977c76628711dcad08bfa5a12280a80728dc9))
* Dispose vMix connection ([7c608fe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7c608feb260897e9fd54256e288a9293cd69a1ab))
* Disposing vMix connection ([c567651](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c56765116858417a3c1bba39fd83aaeb8522fcbb))
* empty string in audio buses ([59e173d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/59e173d7fc421e69fbc1c621be414962d9e8d904))
* Falsey vs undefined checks ([1df0175](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1df0175c61606fbd54551eaced9a00fe6803ffa7))
* fix tests after timeline dep update ([7c793ef](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7c793ef6e6e397d6493020e54be5b3eb298c927f))
* implement all audio properties ([f78b00e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f78b00ee8a17451a9b0eba9d14e641db69f1e8c2))
* Import paths ([82bd382](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/82bd38294af23ec919cdf9b48bd14f819cf09630))
* improve input & transition props typings [publish] ([6044ac5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6044ac559e43ddeb990b91e94cae25c6e9406329))
* Input numbering ([99b856c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/99b856c575f68e71d901b230bb74f15c991068c4))
* Make PLAY_INPUT the last command ([081a2ea](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/081a2eaf805a7c78712423e365dc8dc5177f9ed9))
* obtaining initial state of the device ([63c2950](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/63c2950bed9ab0b789a0231d376a3ce7fe45f540))
* Only switch input if input is not already active ([c9c63cc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c9c63cce2091cd011ca9e57c2b0681f2102662c9))
* Overlay ([34b1f0b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/34b1f0be0fa64649bb5c7a50e9de11f2b16aae49))
* Overlays ([d1676f7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d1676f73dc0881b1dbfe8f6393ff0298c5b46349))
* play and switch after all parameters are set ([4c73be4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4c73be46330dc37be717e8a389cbe55b22c7e04b))
* Preview mapping ([9aa4e32](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9aa4e32e412309193663a124aa89d5520ee37039))
* quantel prioritize clips ([d98626f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d98626f6c5a56cb8e3d19841fd8a18cdf1e533bc))
* quantel prioritize clips; add check for placeholder clip, and improve copying of clips. ([850b2e4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/850b2e4f3c489fad9e7ab7460b250cf920f50605))
* support for using a cache when resolving the timeline, enabling partial-resolving for higher performance ([3ec3eba](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3ec3eba20b8e12387123fff7a1bb2469e47a54e1))
* TSR bug fix ([aa7d535](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/aa7d535ca8a73e71f447e620188a2d535fd0f1cb))
* update timeline dependency ([b28e9ad](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b28e9ad66fa50c9d3b24f1593625dd7b30d175e2))
* **atem:** add ssrc properties in tl to atem state conversion [publish] ([156896c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/156896c33f0e9e01ea89fa38da7835d4b229b1f8))
* **atem:** device state is unavailable when disconnected [publish] ([e53999f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e53999f0c654431ee653a630c8f6c32fe70430f6))
* **atem:** device state is unavailable when disconnected [publish] ([ad32986](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ad32986fcf3c5cd07767c5fc9193037d41430d61))
* Program by name ([3bbc982](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3bbc982b8da7f64278bdb39025060899805ced71))
* Removal order and change on layer ([9e67fbe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9e67fbe834fe8b2b33938ab1758f06e4ef522b86))
* remove Media content type ([f4bd6cb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f4bd6cbaa14c1da93ae844e35652c3b2e31299f3))
* remove redundant expression ([2e1651f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2e1651f297d68cd6689508a07a602b24620a7c40))
* remove request-promise and refactor ([bc0c520](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bc0c520304ecb1f9c84826992da17cb2b18b8ad3))
* remove unnecessary comparisons ([33a5903](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/33a5903b2ad8750148261797ba628f77941778c9))
* Reorder audio on/off commands ([660ba26](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/660ba26ab01508f725bda075bd303c6e279968c8))
* Send multiple transitions of the same type ([a2e47b8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a2e47b8e4b1f28ec29c5dd45b964bcfdc3b80456))
* Support matching input names to file paths ([775adfd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/775adfd27caca5dcaf9cbd1bd4790f462e7796ac))
* Switch to input ([abdcfd2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/abdcfd2d775fc69bcd56c9280593eb522abaf224))
* Timing overlap issues ([813104f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/813104fbb15b19aee22d7a0e4697f149f2de3c78))
* Types ([2cc1b51](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2cc1b5162eed52be0caa7df73ac9221da9d09f3a))
* undefined checks on volume and balance ([426b3e6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/426b3e6c30eecd7a1f3002693f4a713a59b47c40))
* Update interfaces and types ([14e065d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/14e065d883096f12e4a6bfad08df7977e9400c22))
* use queue when adding an input ([ea9b43c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ea9b43c59ebbedd79743ffbdd8af2a265d013865))
* vmix: refactoring and prepare for tests ([68794a8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/68794a8371aa5773dd14ff483fb65974e47252d2))

### [4.0.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/4.0.3...4.0.4) (2020-09-21)


### Bug Fixes

* reset cached states after resolveTimeline has finished ([3237798](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3237798a526c7434a26b19b98f15b6adc7b05fe4))

### [4.0.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/4.0.2...4.0.3) (2020-08-26)


### Bug Fixes

* hotfix quantel-gateway-client dep update [release] ([5b55012](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5b550120d9bac1c55608a1104432a5b5760190c8))

### [4.0.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/4.0.1...4.0.2) (2020-08-25)


### Bug Fixes

* hotfix quantel-gateway-client dep update [release] ([b38bcdd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b38bcddf9d7991dee10456009df82d2215609982))

### [4.0.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/4.0.0...4.0.1) (2020-08-19)


### Bug Fixes

* bugfix: update quantel-gw-client dep [release] ([bd3cf49](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bd3cf49b035aca3c7b77f148c65a572beb6d7700))

## [4.0.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.20.1...4.0.0) (2020-08-17)


### ⚠ BREAKING CHANGES

* drop support for node 8

### Features

* **lawo:** new mapping and objects to do composites of fader values ([d20751b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d20751b011cd87e2d6ec4084a6074ce787f5db4b))
* drop support for node 8 ([c4b84eb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c4b84eb0aabf64434d095f372615e0bd2940cd35))
* emberplus conn upgrade ([#148](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/148)) ([2dbd7f3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2dbd7f336251ce5871b43a5fea1146abed992f04))
* new timelineObject for sisyfos: allowing for setting multiple channels in a single timeline-object ([cc7bfa6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cc7bfa620388c9537a155d877bb221ed7876cdf8))
* quantel: be able to copy a clip from another server, if the clips not present on the desired server. ([30069ed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/30069edc1a54995fc12a5875ed6eed40b486b64a))
* Send custom clear commands to Viz Engines ([4f713dc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4f713dc74a0a9fa3ef19b5e54b7f0fee6495a3c9))
* use p-all instead of Promise.all for better handling when one rejects ([c6bed2e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c6bed2e5319df7789d724a7fa9bbae0cc0ff29c4))


### Bug Fixes

* caching of resolved states not working ([#144](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/144)) ([727558b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/727558bf170829ef345c745dc90c1be88d37f9fe))
* change the clone clip logic ([402fe51](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/402fe513a08dc493c3d59b2716208b7aa5d324a3))
* changed interface to not reference channels directly in tl-objects, instead reference mapped layers ([ece1601](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ece1601208791a3720d12784c4a925405cc76a7d))
* negating negation ([bbcba5b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bbcba5baf0bc0bb1ef014a6312665f5f45230df8))
* only iterate mappings belonging to this device. ignore casparcg mappings with an invalid channel ([49646a4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/49646a44d0ec584df93e04bd4c1fe2044f204d06))
* re-add programInput ([2af1239](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2af123950937e4ba3068c63f55bfe71723ce71fb))
* Remove listeners to prevent memory leak ([3ec3d9f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3ec3d9ff5f2b7188d8f9d9f3459f1995cf64c7c7))
* Retry to initialize the rundown ([aeb1c8e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/aeb1c8e96f3f48173b8a37467fc20c2448f24a0a))
* tests ([bc7291e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bc7291e27f12faa35753ec614373ff26289a6692))
* **lawo:** new tlObj structure uses faderValue ([9c143ed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9c143edfa8b7a535af89dc900ef11b44e9f7c60f))
* set interface to stricter typings ([5115f8e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5115f8eb52117d7719d24b93f10d3ea0a7bc73f0))
* typings package cannot use dependencies ([93ae546](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/93ae546a797380e620c752a0fd685b1331ad670a))
* use library "tv-automation-quantel-gateway-client" instead of internal code ([bf93600](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bf9360017bc0056235de1a7a264dd8b6d723a8d7))

### [3.20.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.20.0...3.20.1) (2020-05-28)


### Bug Fixes

* implement for tcpSend and fix tests ([5a070e1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5a070e1404c3065735ba5b43e2857154192240f3))
* implement for tcpSend and fix tests ([5a070e1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5a070e1404c3065735ba5b43e2857154192240f3))
* improve timeout logging ([595e076](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/595e0766d912a1b875a0a5228a7318de8efe88c7))
* improve timeout logging ([595e076](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/595e0766d912a1b875a0a5228a7318de8efe88c7))
* node8 [publish] ([96d0410](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/96d041079576a38fca926437d26362bdba1e96bb))
* node8 [publish] ([96d0410](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/96d041079576a38fca926437d26362bdba1e96bb))
* remove unused quantel seek property ([9b8f045](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9b8f045b4ce1bb4eddaabab0d4536d9bada82a3c))
* route atem connection logging through logging system ([81ef70c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/81ef70c0b115ffaa6d7d60648980adb3b7890851))
* route atem connection logging through logging system ([81ef70c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/81ef70c0b115ffaa6d7d60648980adb3b7890851))
* some device errors ([e185c14](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e185c145399307388c2c73a5fbe22a6be856b41b))
* **http:** add makeReadyDoesReset property ([b2e2ad5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b2e2ad5f8c699ea847fefef2b440292e421e9e0c))
* some device errors ([e185c14](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e185c145399307388c2c73a5fbe22a6be856b41b))
* **http:** add makeReadyDoesReset property ([b2e2ad5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b2e2ad5f8c699ea847fefef2b440292e421e9e0c))
* remove unused quantel seek property ([9b8f045](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9b8f045b4ce1bb4eddaabab0d4536d9bada82a3c))

## [3.20.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.19.0...3.20.0) (2020-05-06)


### Features

* Sisyfos resync ([8e86ec4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8e86ec4b0cc7b57ddc7db79da2d3a511b0aedbb3))
* **CasparCG:** config for retry interval, retry after sending commands ([22187c5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/22187c5a78a358836abc171bdc4129028a71cb9d))
* **CasparCG:** retry media that failed to load ([7f494b6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7f494b67693e9a75a3c45486cbe65f8900440d14))
* add support for special template which clears all graphics ([17def98](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/17def989b521adabe6798602b131ef3ab43e2d07))
* config option to NOT deactivate rundown on standDown ([8793382](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/87933827610a867eacc8b411bc653033139a2bb8))
* load elements twice, for some reason it doesn't seem to work on all elements the first time ([25916ba](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/25916ba8b15dcd3e6fbcff04f3678c95fb9223b6))
* vizMSE device: preload (cue) all expectedElements. trying to be clever about it ([29571a3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/29571a3e51897687df61cf5ccb87bef3e8e6dfc2))
* vizMSE outTransition delay ([dfb2d30](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dfb2d3078791b8139e0b5776a82d08d26099c8cb))
* vizMSE: add option: onlyPreloadActiveRundown ([6b66409](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6b66409c4872e74b06bbf4ca551548142700d9d7))
* **ccg:** Better support for AB playback ([20f17bc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/20f17bc4858e8665fc83bfd39a266fcc43ddde09))
* **Sisyfos:** device reset on makeReady ([9c465f9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9c465f9f3c0443b8d2c932652f14d8a1c39f35ca))
* Add support for LOAD in AB Playback ([950d8b5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/950d8b566bceaf64a10545b85741f537b6d2d326))
* initial implementation of vizMSE device ([2d4c775](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2d4c7758cb5cbbc37eea594c0540ae5410bc6439))
* initial implementation of vizMSE device (wip) ([33489d4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/33489d428b6c24df9665870d48ff3ee1ecce8863))
* preliminary timeline typings for upcoming vizMSE-device ([148f5f0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/148f5f04103526f07482192dfb9e20d4694c0299))
* vizMSE: add .noAutoPreloading, preventing these elements from preloading (cued) ([bd48d87](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bd48d872107fa93ad01e936c460b3d07618cb1c9))
* vizMSE: add separate continue timeline-object ([74ffa9c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/74ffa9c5c91ab80ff252a509f303995a01e47c9b))
* vizMSE: be able to cue elements ([dc621a1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dc621a18c6e53a6a1a612c42acf6786ca905c3d5))
* vizMSE: continued implementation ([3844185](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3844185871117b726cb48f3928004e3e3212cb10))
* vizMSE: continueReverse ([1bd30dc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1bd30dc8196acf8b0296429bd8976124eb5caffb))
* vizMSE: handle some errors and try again a few times ([944edbf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/944edbff8a10b927914f12fedd1a34af36824544))
* vizMSE: new (pre-)loading procedure, triggerable by timeline and makeReady, which will load all elements at the user's discretion ([36db63d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/36db63d0c156f659764e324c66c36a70b4f69331))
* vizMSE: playlistID for creating rundowns ([3f312d4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3f312d4167611fa4aa61411b5c7f10bec64f76a2))


### Bug Fixes

*  update v-connection ([a0ea4d1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a0ea4d147e6b2b068394e0866e1a87449e4c6e8c))
* add activeRundownId to devicesMakeReady ([d4baeee](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d4baeeebe597d29e267122a3a2f7158a00b4a65b))
* Apply caspar state for retry ([c1b94a0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c1b94a0876fd8387edbd02497f37c72511f287a3))
* casparcg timings ([0127f53](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0127f53e650297950db6997413f5d71f9b9ac880))
* change language and logics of determining wether an element should be loaded or not ([bb8a095](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bb8a0959855b9bdf194acb1f0c2ff655a1edf993))
* changes pulled in from /develop ([33ca1cc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/33ca1cc4ad638076340aa137297ac9de51511274))
* channel format enum values ([#138](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/138)) ([45887d4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/45887d40308ca301432ef2238cae6bb91780ded9))
* Check if retry is disabled ([eac0e3e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/eac0e3efc0163df298391ace0ddb8f06366ad7d6))
* Command assignment ([0630a10](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0630a10a1ea7dfd79f1ea26f5e8651bcb5dd5e95))
* conductor using different import paths ([9f63046](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9f63046cea2fdc353dff40bb7b538eb6fd4dc12d))
* default casparcg.retryInterval to disabled ([60931c7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/60931c7dffaff826a9498d6a25938ebc8384e858))
* do not retry resume commands ([1b9bfab](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1b9bfab31131c53dd74e65743ac3b6cc7fb80bca))
* Don't delay takes before pilot-out ([a38fe0a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a38fe0ab96916b844ed9e2f6762249077b9d267b))
* don't try to load elements that doesn't have a templateName set ([6a36bed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6a36bed94f9fdd3a9e7b31259b5e33d52a59b229))
* emit like debug, not an error ([bd20189](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bd2018965b202a21232eb3b8ab95fe2516e3a885))
* hack/test: be able to do a second activate of the rundown on LoadAllElements, to hopefully load all internal elements also. ([b6a40ec](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b6a40ec8147d8106393ac9e9ad2b80619e341722))
* inverted logic ([64ae293](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/64ae293f9313e21635984d1a4b663d29418eb437))
* Only copy delay to internal elements ([15e9471](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/15e94712342905b9fa5a5e1797da82dc4f57baff))
* Retry logic, command filters ([f46603c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f46603c930380e573b5d4130b8698e6201786223))
* Sisyfos labels when label is undefined / previously unknown ([0e1f6fc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0e1f6fc673f52832c5d83ccdf09db9d537794bbc))
* temporary hack: don't activate show twice ([b96a5e4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b96a5e4e195ff4543fa1493e6cfd2383b35f074b))
* tests [publish] ([6577f6e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6577f6ebe830ec0c5de834eba5c8646a796f6276))
* threadedClass `DataCloneError: class StatusValidator` ([d89c232](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d89c23261ebe65f91e4cd537e7af07e3c10984a5))
* tidy some EventEmitters to be safer with ThreadedClass ([6f1b708](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6f1b708fda70097c2125c325bceef8dde4d72302))
* TSR dep: test: Viz pep ws reconnect ([d8309eb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d8309eb4eb662dccf5c8c92378b6f9d553f759bc))
* typing errors ([5fcc234](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5fcc2344232ea94e318a361dde2021d4e90885bc))
* update typings and fix tests ([dc8d066](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dc8d066d486de53bf8e00447bcafb26e77d725dc))
* update v-conn dep ([cb5c305](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cb5c305faf7d3dd0032a49bb43a927eda270f0cd))
* Use retry timer ([9be95f2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9be95f256d426b0e82da938012ecafaa2f1ff974))
* v-conn dep ([70f2cb1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/70f2cb11806bd4a21181dd4a212efcfced39de4d))
* v-connection ver: Internal element channel ([dee8d70](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dee8d7035e1ca4897e0d25e08126d003b655386f))
* viz: another go at loading elements ([8c14fad](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8c14fade01291ff5609a754d4deea368b087296f))
* viz: display loaded status of internal elements as well ([e752e82](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e752e8291a1308a8c42d503b8b0d4303d63750ff))
* wrapping a thrown error in an Error changes the content of it, causing it to turn into a Error('[object object]') ([e2a8dc7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e2a8dc75e69356b1a5fe5b50066434472dc62b5e))
* **CasparCG Retries:** filter out all playback related commands ([559fff1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/559fff1cd7de95bf295c16ebbc5016727e1e39db))
* A/B-playback: force the playTime to be null, so that previous playTimes doesn't leak through ([7a3bbeb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7a3bbeb3a5c51cda1edf6cd2c39dcadd99246964))
* ab-playback uneccessary startTime change ([a168769](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a1687694dcd57c62e06de712f85cc78f4c42cc91))
* ab-playback, for playtime and pausetime to be consistent and the same for lookahead ([55c0d01](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/55c0d01c0442fef8d44273292e1c70bda4e3f8a6))
* add channelName fo vizMSE device ([8b39d88](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8b39d88020395034689f30f5e92d37f792b9ec4b))
* add guard against when an element can't be created, to fail more gracefully ([af82550](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/af82550efb3034d8f2e4175f70b8be1e714720b4))
* add vizMSE device to conductor ([f131cd5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f131cd55fcd23dd8cc08bd575cb3014194aeeafb))
* Channel visibility ([7a52612](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7a52612630e640ad43a7ad9eb4f6a935b361e418))
* circleci ([312270a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/312270a0e6b26e8f39c54c82ac2c1e88fe1634cb))
* Context messages ([06202b1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/06202b1bb0efa4922c0141b4b42e51b01444de6a))
* don't ignore purge error, but emit it ([a5d0c25](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a5d0c256fb0c1ee8fe5697dc5530c91f6427bef4))
* error handling ([371db3a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/371db3a5906cd11d279bb95f8c8b747e09ce695e))
* expose vizMSEDevice ([43813b9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/43813b9266d2d83037d97ebadd24d16598954935))
* Guard against undefined ([2535c3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2535c3b9d2ba323ae2092f915292736bde29c919))
* ignore error "Cannot purge an active profile" ([5c8f3cf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5c8f3cf47dd3df693a9b9f6e3d45446c19d5f0c4))
* load after play ([f281e47](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f281e47bb57e5b9eef0883b1f95162a3d6343b9e))
* MSE crashes if we try to take an element which doesn't exist. Try to prevent that by checking before take:in ([604ab64](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/604ab64caa7e44a9aa6ccee7fb61a9a46547c440))
* NodeJS.Timer ([d96b400](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d96b400486697e6dfa256bbae46e4a4d45aa6652))
* only preload if rundown is active ([a5d321d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a5d321de47a4bc575b99c97afd8e5e17aa6db226))
* purge rundown on activate ([14d282a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/14d282afafb6ca666009e16cce32924e86250822))
* remove debugger ([477617a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/477617aeb95ab039983f75d08220670190f2d287))
* Sisyfos protocol - remote local ip and port ([edb59d9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/edb59d9113dc07568c8f81bd43a3a0d4e1b0d3ee))
* Sisyfos state recieves showChannel not showFader ([9dd5cfe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9dd5cfe43c541313fe9ea4d5e9e5e9ff30e553af))
* sisyfos: fix when mapping.channel === 0 ([7e9b77e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7e9b77e7fce5bdb17b2b282918d826c50b68ba51))
* SisyfosAPI.ts added localport and ip (hardcoded 5255) ([8534a66](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8534a66e936ba9d05540b517248bf75caa67cf36))
* templateName can be a number for pilot elements ([d783253](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d78325359fd609afb1741fcea88b2a1b3304484a))
* update v-connection ([7598b6b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7598b6b9ee323e8b1d15ed035a7e83a76ee7e2dd))
* update v-connection dep ([ba0bc76](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ba0bc76181dbf1a8adb66fa8afbca78b3a1ead55))
* update v-connection dep ([30421eb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/30421eb64a11fef62714951d81b3b14131db6b03))
* v-connection update ([71f48d1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/71f48d176ff5a6d31fbbe71f6f45a5c3b7714269))
* vixMSE: fixes and refactorings: ([428ba1f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/428ba1f80593fcd50abe4d4b453307a6a8d19efd))
* Viz: Either push not connected message OR other warnings ([f18a6ae](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f18a6ae97b0b5a4b001a2f24f6778554d0b30650))
* viz: optional: automatically load internal elements (by initializing the viz show again) as they appear in expectedPlayoutItems. ([e3f73ed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e3f73ed4fccada919028038b883a1e394506b493))
* viz: state mgmnt for isClearAll ([a7136cd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a7136cd9ffd3c8d1f47f9fefc4312f549bf96b10))
* vizMSE emit error if thrown in monitor ([621b203](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/621b203596661cf50c81ac79e6168a1d4fe8afb4))
* vizMSE fixes ([2a9bc01](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2a9bc018ab704070fdc876a7201227f627b4c3fb))
* vizMSE logical bug fix ([3e5be59](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3e5be59be31402a8131de336cbc99ff746c35a70))
* vizMSE: actually set item to hasBeenCued after having cued it.. ([76d7dac](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/76d7dac2c86fa83e9c83f70b6c198a5d500f4a2b))
* vizMSE: ignore timeline-object id and outTransition when diffing, so that no new take is sent if just the id has changed. ([967ebb5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/967ebb5a754262b0b05810f0195730045c457550))
* vizMSE: monitor and ping the MSE, to check connection status better ([c7cbc3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c7cbc3bde2bde6e904e4b7f9154d8342ae220e9e))
* vizMSE: sort the commands so that takeOut:s are run before takes ([5963dfe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5963dfe8aa8c45444bfb4364053c186216dfdbc7))
* vizMSE: wait a bit aftter having prepared an element ASAP ([711e595](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/711e595e39e91a9ca6f5a354b35592bebfe01ab8))
* with new v-connection, element.name might be set ([2877b6f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2877b6fc8ccf3dfe92473c957a021ccad1ca8ff0))
* **ccg:** Update deps and fix tests ([33be86d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/33be86dc38a0cf7b778ea9ddd83154f6e46ea7d6))
* vizMSE: wrong time was used ([cf84ad7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cf84ad7a069afd51758d9e015e4a70ef42ede2c3))

## [3.19.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.18.0...3.19.0) (2020-03-25)


### Features

* **ci:** optionally skip audit ([aef36e8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/aef36e80a29d2bf1d4500118844900626e711fdf))


### Bug Fixes

* **quantel:** catch error on missing ISA after restart ([#135](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/135)) ([e1f7979](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e1f79797d366dada142138d6803d01ffa3b03726))

## [3.18.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.17.0...3.18.0) (2020-02-19)


### Features

* atem media player sources ([95f897a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/95f897a0572ce0c21a2fa95f062cce20c885dfc8))


### Bug Fixes

* update osc dep to latest version, fixing an issue with an optional dependency of serialport ([812b225](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/812b2250827d90cc8e10bf35a9fc69c4fbea3b83))

## [3.17.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.16.2...3.17.0) (2020-01-08)


### Features

* atem media pool config ([#132](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/132)) ([f9b4a9f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f9b4a9fd218675e3fc848ead8ec6c4b811678f6a))

### [3.16.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.16.1...3.16.2) (2019-12-16)


### Bug Fixes

* update deps for a bugfix in casparcg-state ([530975c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/530975cdfaf0c9e45db9ddc76a37443edf686593))

### [3.16.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.16.0...3.16.1) (2019-12-10)


### Bug Fixes

* bug fix in callbacks ([b22241b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b22241bf57589ec91f8eb514c6b753fd19077469))

## [3.16.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.15.1...3.16.0) (2019-12-03)


### Features

* **casparcg:** support delay on Route ([e33b700](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e33b7006fcf7dbaf087c2b432e0021decd8ef322))


### Bug Fixes

* **lawo:** type checks in setValue for command and explicit type ([07a959a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/07a959afdfd664a559cda588a7ad86afd0b7620f))

### [3.15.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.15.0...3.15.1) (2019-11-21)

## [3.15.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.14.0...3.15.0) (2019-11-20)


### Features

* new try on timelineCallbacks ([87bf290](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/87bf2903cc4dbf530b2167cb840cf5987fea3880))


### Bug Fixes

* CasparCG transition types ([3a0bb18](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3a0bb1899eaacf21aa51320ba34933b141ea7f97))
* CasparCGOptions.launcherPort type incorrect (string vs port) ([20d29e5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/20d29e5bd7cc714e5701e911f09ff6d34354e68d))

## [3.14.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.13.2...3.14.0) (2019-11-14)


### Features

* **casparcg:** sting transition fade parameters ([2a82d50](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2a82d503abff990a5e88f33aeaded6d5d5011af4))
* update ci to run for node 8,10,12 ([fd9798b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fd9798bbf29a412e3a613f5cacb5a684634c9e92))


### Bug Fixes

* lawo result 6 mitigation ([7ad7f53](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7ad7f536ac5c09d87b6e0498ba7be1b36d429a18))
* **casparcg:** sting parameter typings ([112816a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/112816a2b31e64b49354df8a5787e3d8ae89963b))
* estimateResolveTime was unused due to avoiding any resolves for times in the past ([2f89140](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2f89140398cd7425cb46e11abc3d91d45e6ec401))
* fix typings issue in singularLive device ([fb93a74](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fb93a74708e2755fefd2e6145b2d5f17ac5b0914))
* node12 typings ([49dfaba](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/49dfaba59af8c4b9c9c87d4e5777859a1836d2ef))
* refactor and fix: unify types & interfaces of all devices. ([e990811](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e990811617a8798c77be8c1415e4d4daf53ed008))

### [3.13.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.13.1...3.13.2) (2019-11-07)


### Bug Fixes

* estimateResolveTime was unused due to avoiding any resolves for times in the past ([a497d6b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a497d6b))



### [3.13.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.13.0...3.13.1) (2019-11-06)


### Bug Fixes

* **hyperdeck:** support pre 6.0 firmware ([0ab52cc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0ab52cc))



## [3.13.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.12.1...3.13.0) (2019-10-25)


### Bug Fixes

* abstract device trying to be casparcg ([27cee9c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/27cee9c))
* change id of singular device, to make way for upcoming vizMSE device ([5c0c8c9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5c0c8c9))
* update atem dependencies ([a06f414](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a06f414))
* use Timeline object instance.originalStart instead of .start. ([f110051](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f110051))


### Features

* a better implementation of Singular.Live integration ([7fe543f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7fe543f))
* **hyperdeck:** enforce remote control ([dd40e2b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dd40e2b))
* **hyperdeck:** notification for stopped recordings ([3fe1c58](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3fe1c58))
* **hyperdeck:** warn for unoccupied slots ([927df23](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/927df23))
* casparcg: use timeline contentStart ([bd5f648](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bd5f648))
* initial implementation for Singular Live ([f89e4d3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f89e4d3))
* update atem-state to support v8 firmware ([c229d94](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c229d94))



### [3.12.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.12.0...3.12.1) (2019-10-15)


### Bug Fixes

* **atem:** audio channel tsr objects are correctly merged ([e3a8e8b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e3a8e8b))



## [3.12.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.11.1...3.12.0) (2019-10-14)


### Features

* use a timeline obj to retrigger lawo commands ([c93c109](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c93c109))



### [3.11.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.11.0...3.11.1) (2019-10-03)


### Bug Fixes

* upd threadedclass dep ([460aa3a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/460aa3a))



## [3.11.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.10.0...3.11.0) (2019-10-03)


### Features

* **lawo:** optionally set interval time for manual faders ([2c840e5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2c840e5))



## [3.10.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.9.1...3.10.0) (2019-10-02)


### Bug Fixes

* quantel: kill path ([0d3999e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0d3999e))
* revert dependency update of typescript, which caused lots of strange linting errors ([e91f4a3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e91f4a3))


### Features

* quantel restart mechanism ([ce93586](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ce93586))



### [3.9.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.9.0...3.9.1) (2019-09-23)


### Bug Fixes

* **lawo:** prevent conflicting setValue after result 6 ([b615121](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b615121))



## [3.9.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.8.5...3.9.0) (2019-09-23)


### Bug Fixes

* **lawo:** append value to integers for setValue ([926073e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/926073e))
* **lawo:** check for errors by searching array ([6edbe4f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6edbe4f))
* **lawo:** log when a direct setValue is done after result 6 ([91f535e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91f535e))


### Features

* Use setValue if the ramp will/has failed ([96ed756](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/96ed756))



### [3.8.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.8.4...3.8.5) (2019-09-20)


### Bug Fixes

* Quantel: set all lookahead objects as notOnAir ([be96d3c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/be96d3c))



### [3.8.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.8.3...3.8.4) (2019-09-20)


### Bug Fixes

* add Lawo mapping.priority, as a workaround to an issue with the Lawo processing commands too slowly ([42c8f47](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/42c8f47))
* callback on stopped was sent too early, send callback through doOnTime queue ([dd188f4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dd188f4))
* improve lawo command logging ([91859cd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91859cd))
* log lawo commands being sent ([3114c31](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3114c31))



### [3.8.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.8.2...3.8.3) (2019-09-04)


### Bug Fixes

* add instanceName to resolve instance ([e9765c4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e9765c4))
* issue with wrongly accusation of unhandling of a Promise. (I most certainly was not!) ([05eee7d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/05eee7d))
* updated threadedClass dep, for better error tracing ([c5cdafe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c5cdafe))



### [3.8.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.8.1...3.8.2) (2019-09-03)


### Bug Fixes

* add device option.reportAllCommands, to be able to deactivate the sending of command-reports over the wire. ([1729a06](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1729a06))
* set the instanceName of multithreaded instances, to help during debugging ([17f6779](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/17f6779))
* timeline dep with bug fixes ([d3860c6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d3860c6))



### [3.8.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.8.0...3.8.1) (2019-09-03)


### Bug Fixes

* threaddedClass dep and properly close event listener on quit ([63dd1e6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/63dd1e6))



## [3.8.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.7.7...3.8.0) (2019-09-02)


### Bug Fixes

* add a method to clear the future (invalid) states earlier ([e6ad98f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e6ad98f))
* disconnect hyperdeck-connection before termination ([e6bd395](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e6bd395))
* prevent unnecessary hyperdeck status updates ([7f1f6de](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7f1f6de))
* quantel: make lookahead clips not care about seeking ([6f39b9e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6f39b9e))


### Features

* add notOnAir propery on timelineObjects. Quantel: make outTransition when next object is notOnAir. ([687e54c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/687e54c))
* add outTransition together with notOnAir support for quantel device ([b752bf9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b752bf9))
* quantel: monitor ports and channels, update status if the ports/channels we need are not available ([fb674d6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fb674d6))



### [3.7.7](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.7.6...3.7.7) (2019-08-28)


### Bug Fixes

* allow the consumer to monitor and restart devices manually. Don't automatically restart them anymore ([5e51629](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5e51629))
* make quantel-gw emit ell commands, for debugging ([befcd80](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/befcd80))



### [3.7.6](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.7.5...3.7.6) (2019-08-28)


### Bug Fixes

* Every TSR device now stores a random instanceId, to be used in logging/troubleshooting ([bb6e607](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bb6e607))
* Every TSR device now stores its start time (for uptime calculation) ([e065c09](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e065c09))
* fixes in all devices status reporting. Especially: when not initialized, status should not be GOOD. ([fb625a9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fb625a9))



### [3.7.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.7.4...3.7.5) (2019-08-27)


### Bug Fixes

* quantel: a try to get the quantel player to behave nicely when jumping to a new clip ([424f1f7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/424f1f7))



### [3.7.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.7.3...3.7.4) (2019-08-27)


### Bug Fixes

* increase he jump error margin to 10 frames, giving us a little more leeway in case of delayed execution ([5f52352](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5f52352))
* make quantel use 25 fps (50i) by default ([549cbca](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/549cbca))
* quantel: add missing tracking of jumpOfffset. When a jump is triggered, the jumpOffset is cleared ([82a481d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/82a481d))
* quantel: don't try to execute preparations in the past, the present should be sufficient ([9b636f3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9b636f3))
* quantel: make the wait times longer when trying to recover from a play failure ([62274c2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/62274c2))
* quantel: only use videoFragments when calculating last frame of clip. Also son't use trackNum < 0 because it is historic data (not used for automation), 0 is the normal, playable video track, > 0 are extra channels, such as keys ([44ce171](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/44ce171))



### [3.7.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.7.2...3.7.3) (2019-08-27)


### Bug Fixes

* hyperdeck: not conencted status message ([d88530b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d88530b))
* quantel: typo in warning emit on recovery operation. also add emit debugging info ([3745177](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3745177))



### [3.7.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.7.1...3.7.2) (2019-08-26)


### Bug Fixes

* if, for some unknown reason, the quantel device doesn't start playing; retry a couple of times ([7fb8a4e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7fb8a4e))



### [3.7.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.7.0...3.7.1) (2019-08-24)


### Bug Fixes

* correct quantel API ([5b8023e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5b8023e))
* preliminary workaround, to give the quantel another chance to get going at startup ([fe25898](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fe25898))



## [3.7.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.6.0...3.7.0) (2019-08-24)


### Bug Fixes

* don't re-emit info, warnings or errors from devices, let the library consumer handle that. ([40048d2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40048d2))
* quantel: don't send jumps twice (first was after fragment load, second before playing) ([4dbe824](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4dbe824))
* threadedClass dep. fixes a fatal bug that caused main process to quit. ([47dc740](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/47dc740))


### Features

* all devices: refactor how to handle doOnTime events, and add commandReport listener ([5360e4f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5360e4f))
* doOnTime: emit commandReports on every command ([7ea4cbd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7ea4cbd))
* properly terminate child processes when removing devices ([15fb922](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/15fb922))



## [3.6.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.5.0...3.6.0) (2019-08-19)


### Bug Fixes

* ssrc box enabled is optional ([17c84ac](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/17c84ac))
* tidy lawo commands ([3497bce](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3497bce))
* update atem-state and fix tests ([98ad55d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/98ad55d))


### Features

* **emberProperty:** fixes and adds support for typed values for direct emberplus properties ([52e2bca](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/52e2bca))
* **emberProperty:** started adding support for lawo objects setting values directly on absolute ember paths ([8375f44](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8375f44))
* basic atem macro player ([32457eb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/32457eb))
* lawo fullpath & atem macros ([#96](https://github.com/nrkno/tv-automation-state-timeline-resolver/issues/96)) ([5bcff58](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5bcff58))



## [3.5.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.4.0...3.5.0) (2019-08-19)


### Bug Fixes

* **HyperDeck:** format every slot (not just current) ([307103b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/307103b))
* **HyperDeck:** improved status reporting ([95587d7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/95587d7))


### Features

* **HyperDeck:** report recording time ([44755d2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/44755d2))
* hyperdeck disk formatting ([9716bf2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9716bf2))
* update hyperdeck connection dep ([7c94a8e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7c94a8e))



## [3.4.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.3.0...3.4.0) (2019-08-19)


### Bug Fixes

* quantel typings exports missing ([6e852ee](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6e852ee))
* quantel: handle when quantelGateway hasn't connected yet (or has been restarted) ([c39b57a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c39b57a))


### Features

* quantel gaeway: support for the resetPort endpoint ([fa60faa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fa60faa))
* quantel: reset the port, when clearing the clip on a port, to get a black output. ([3f40430](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3f40430))
* quantel: support for outTransition, ie a delayed clear ([45bce79](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/45bce79))



## [3.3.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.2.1...3.3.0) (2019-08-13)


### Bug Fixes

* add quantel guid support ([194e551](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/194e551))
* casparcg-state update (bugfixes) ([549315b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/549315b))
* doOnTime bug fix ([dbcfa5b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dbcfa5b))
* preliminary implementation of handling quantel-gateway-not-connected-to-ISA situation ([28b4836](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/28b4836))
* quantel: skip jumping and go straight to play, if the jump is small enough ([9071df4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9071df4))
* quantel: tests ([e05387e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e05387e))
* quantel: unable to assign channel 0 ([48efdb2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/48efdb2))
* Quantel:better ordering of commands at creation ([722c758](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/722c758))


### Features

* quantel lookahead support ([3d5f54e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3d5f54e))



### [3.2.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.2.0...3.2.1) (2019-08-06)


### Bug Fixes

* add missing sisyfos types ([4bc54a9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4bc54a9))
* quantel: try/catch block didn't catch as intended ([9e91e8a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9e91e8a))
* remove unimplemented interface ([f6b6b52](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f6b6b52))



## [3.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.1.1...3.2.0) (2019-08-06)


### Bug Fixes

* better support for when the name of a device cannot be determined until after .init() ([a6f1ad0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a6f1ad0))
* Bug when resolving timeline with repeating objects ([9e01dc7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9e01dc7))
* change some emits to debug instead of info ([b84342c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b84342c))
* corrected return type of loadPort and changed calculation of portOutPoint ([e54b74d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e54b74d))
* minor bug ([41d6599](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/41d6599))
* osc: fix timelineObj content type so that fromTlObject isn't in there ([6b300a0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6b300a0))
* possible bug when throwing error, that might cause resolving to halt ([e1cb023](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e1cb023))
* TCPSend: added tests ([6405552](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6405552))
* **quantel:** remove command-queueing, this will be handled in quantel-gateway instead ([d43a192](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d43a192))
* typescript build errors ([14c2dff](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/14c2dff))
* **quantel:** better handling of in/out points ([28fefee](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/28fefee))
* **quantel:** bugfix: stop at correct frame ([04be540](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/04be540))
* **quantel:** check input options ([76813b3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/76813b3))
* **quantel:** handle error responses ([fc8a94f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fc8a94f))
* **sisyfos:** comply with automation protocol ([b9ba380](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b9ba380))
* **sisyfos:** do not accept state before initialization ([6ab3dda](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6ab3dda))
* **sisyfos:** remove groups ([c9f9e33](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c9f9e33))
* **sisyfos:** rename select to isPgm ([52d3b11](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/52d3b11))
* **sisyfos:** wrong transition function ([b06ec91](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b06ec91))


### Features

* add TCPSend device (wip) ([88618ff](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/88618ff))
* commandContext for tcpSend device ([71c8221](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/71c8221))
* emit statReport ([179d016](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/179d016))
* Implement support for Quantel-Gateway device ([3b38526](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3b38526))
* **doOnTime:** return removed count ([dcee1c0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dcee1c0))
* sisyfos device ([cb92701](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cb92701))
* sisyfos: add connectivity status monitoring ([c3a868a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c3a868a))
* TCPSend: continued implementation (wip) ([ab84254](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ab84254))
* update TCPSend device, getStatus ([551e18b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/551e18b))
* updated typings from Quantel Gateway ([04d77e8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/04d77e8))
* **quantel:** cache clipId, so it doesn't have to query it again too often ([3b3d43f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3b3d43f))



### [3.1.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.1.0...3.1.1) (2019-08-01)


### Bug Fixes

* export all typings, not just a selection. This allows for consumers to only have to import TSR-types additionally, when importing TSR ([8ee6ec6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8ee6ec6))
* fix issue with typings library, causing it to not be importable by consumers ([8b2452e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8b2452e))



## [3.1.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/3.0.1...3.1.0) (2019-07-30)


### Bug Fixes

* dispose of atem properly ([46a9055](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/46a9055))
* stronger typings on the device eventEmitters ([ad145b5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ad145b5))
* typo ([b7a34ee](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b7a34ee))
* update dependencies ([2622dfa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2622dfa))
* update of dependencies ([080600c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/080600c))


### Features

* add support for commands with context ([bf20e44](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bf20e44))
* devices emit "commandError" events when there is a problem with a comand ([72e8d3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/72e8d3b))
* OSC Tweened properties ([96fa04c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/96fa04c))



## [3.0.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.0.0...3.0.1) (2019-05-21)


### Bug Fixes

* Update supertimeline dep ([3c89511](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3c89511))



# [3.0.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.2.0...3.0.0) (2019-05-21)


### Bug Fixes

* cunductor: better handling of when future is clear ([471d905](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/471d905))
* decrease hyperdeck ping for faster connection status ([fb151e9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fb151e9))
* Guard against object being undefined ([d96d398](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d96d398))
* handle non-decript looping casparcg-video ([b23a8a8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b23a8a8))
* Linter errors ([27dc142](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/27dc142))
* Update TimelineObjEmpty. Fix some incorrect import paths ([5e7b66c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5e7b66c))


### Features

* Add accurate typings for TimelineObject.keyframes ([0a116dc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0a116dc))
* add casparcg-property noStarttime to avoid seeking in certain situations ([e591c0d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e591c0d))
* Expose isLookahead and lookaheadForLayer on TSRTimelineObjBase ([22841a8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/22841a8))
* implement Timeline version 2 and various improvements to the timeline resolving & typings ([32574ff](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/32574ff))
* support for multiple queues in doOnTime, so that IN_ORDER can burst some commands, while run others in order ([8bbc0b8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8bbc0b8))
* update timeline lib ([a499d5f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a499d5f))
* update timeline typings ([127644b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/127644b))


### BREAKING CHANGES

* new timeline interface, slightly changed timeline logic



# [2.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.1.1...2.2.0) (2019-05-21)


### Bug Fixes

* negated negation ([033ea4c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/033ea4c))


### Features

* add casparcg-property noStarttime to avoid seeking in certain situations ([c7efc87](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c7efc87))



## [2.1.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.1.0...2.1.1) (2019-05-13)


### Bug Fixes

* decrease hyperdeck ping for faster connection status ([ab24d55](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ab24d55))



# [2.1.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.0.2...2.1.0) (2019-04-11)


### Bug Fixes

* deprecate .VIDEO & .AUDIO in favor for .MEDIA ([898ba8c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/898ba8c))


### Features

* **atem:** Audio Channels ([450c26d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/450c26d))
* add support for casparCG looping, seeking & inPoint ([dd4dacf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dd4dacf))
* Combine casparcg VIDEO and AUDIO types into single MEDIA type ([f675e6f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f675e6f))



## [2.0.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/2.0.1...2.0.2) (2019-03-27)


### Bug Fixes

* **atem:** Broken tests ([0a30477](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0a30477))
* **atem:** double wipe ([41fab2b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/41fab2b))
* Add guard to all device types ([7db1b97](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7db1b97))
* Some callbacks not being sent ([d89af30](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d89af30))



<a name="1.7.1"></a>
## [1.7.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.7.0...1.7.1) (2019-02-13)


### Bug Fixes

* **tsr:** Restrict the next resolve time to inside the current window, to ensure we don't miss something that the timeline excluded ([afa514d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/afa514d))



<a name="1.7.0"></a>
# [1.7.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.6.3...1.7.0) (2019-01-31)


### Bug Fixes

* add option to enabled multithreading ([6d45f64](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6d45f64))
* **ATEM:** Better description of PSUs in warning. The old message "...2/2 is faulty" could be read as both PSUs being down, which isn't what the warning is trying to tell. ([92b30b3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/92b30b3))
* **CasparCG:** Adds deviceID to the devicename for consistency ([cd3fc4e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cd3fc4e))
* bump hyperdeck-connection fixes connection state ([61dd155](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/61dd155))
* ccg-con potentially not initiated. ([d1ea910](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d1ea910))
* defer and group toghether timelineCallbacks, to avoid sending "stopped" directly followed by "started" events. ([7f7ce04](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7f7ce04))
* **Panasonic PTZ:** disconnection should not give errors ([ecea5c6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ecea5c6))
* failing ci build ([cdd0f52](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cdd0f52))
* Pharos started reconnecting infinitely if connection failed. (this is NOT tested yet) ([91ff721](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91ff721))


### Features

* add timelineCallback on stopped event ([cd12fa6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cd12fa6))
* **atem:** Simplify lookahead handling logic to only support WHEN_CLEAR and the updated RETAIN mode ([5e82a3b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5e82a3b))
* set threadUsage from deviceOptions ([d00f57b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d00f57b))



<a name="1.6.3"></a>
## [1.6.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.6.2...1.6.3) (2019-01-19)


### Bug Fixes

* **casparcg:** device name ([981e621](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/981e621))



<a name="1.6.2"></a>
## [1.6.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.6.1...1.6.2) (2019-01-14)


### Bug Fixes

* **http:** Sort commands by llayer before queueing to make execution order deterministic ([a93fdc1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a93fdc1))



<a name="1.6.1"></a>
## [1.6.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.6.0...1.6.1) (2019-01-14)


### Bug Fixes

* **CasparCG:** Adds deviceID to the devicename for consistency ([21ca820](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/21ca820))



<a name="1.6.0"></a>
# [1.6.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.5.0...1.6.0) (2018-12-19)


### Bug Fixes

* Fix atem make-ready debug log parsing in kibana ([9fb09d5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9fb09d5))
* Fix atem make-ready debug log parsing in kibana ([9880672](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9880672))
* **atem:** listen on state changes to update psu status ([f305181](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f305181))


### Features

* **casparcg:** Add channel_layout to TimelineObjects ([c77e765](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c77e765))
* **CasparCG:** channel_layout property ([4101e74](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4101e74))



<a name="1.5.0"></a>
# [1.5.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.4.2...1.5.0) (2018-12-04)


### Features

* OSC Device ([01adfa8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/01adfa8))
* **osc:** Add tests ([a934b16](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a934b16))



<a name="1.4.2"></a>
## [1.4.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.4.1...1.4.2) (2018-11-30)


### Bug Fixes

* Missing dependency for types package ([da6bc82](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/da6bc82))
* Move DeviceOptions interface to types package ([ac300eb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ac300eb))



<a name="1.4.1"></a>
## [1.4.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.4.0...1.4.1) (2018-11-27)


### Bug Fixes

* fix Zoom Control command template ([53966f8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/53966f8))
* improve PTZ logging ([4f41c53](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/4f41c53))



<a name="1.4.0"></a>
# [1.4.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.5...1.4.0) (2018-11-26)


### Features

* add origin descriptor to all error emits ([df2de4d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/df2de4d))



<a name="1.3.5"></a>
## [1.3.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.4...1.3.5) (2018-11-22)


### Bug Fixes

* removed types export (consumers should depend on the types package instead) ([8b31e6a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8b31e6a))
* wrong dependency in types package ([78e5b8f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/78e5b8f))



<a name="1.3.4"></a>
## [1.3.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.3...1.3.4) (2018-11-22)


### Bug Fixes

* Update ccg-state (fixes ccg sting transition) ([faf1f43](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/faf1f43))
* **types:** add timeline exports ([9f70714](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9f70714))
* **types:** timeline export ([af32616](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/af32616))



<a name="1.3.3"></a>
## [1.3.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.2...1.3.3) (2018-11-19)



<a name="1.3.2"></a>
## [1.3.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.1...1.3.2) (2018-11-19)


### Bug Fixes

* **types:**  types file structure ([0dfce5e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0dfce5e))
* **types:** upd imports ([2b758fe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2b758fe))
* (false) linter errors, temporary disable linting ([3d6ad7d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3d6ad7d))
* import types ([7d05864](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7d05864))
* PanasonicPTZ types ([b2af5c3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b2af5c3))



<a name="1.3.1"></a>
## [1.3.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.3.0...1.3.1) (2018-11-16)



<a name="1.3.0"></a>
# [1.3.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.2.0...1.3.0) (2018-11-16)


### Bug Fixes

* linter errors ([cd9403f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/cd9403f))
* PanasonicPTZ typing ([c6dfbe3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c6dfbe3))
* typings package ([337e8be](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/337e8be))
* update some exposed typings ([74cabe0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/74cabe0))


### Features

* Adopt TimelineObj types from blueprints/core ([66621fa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/66621fa))
* Create a subpackage for types that are useful elsewhere ([922ceda](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/922ceda))
* Move device options to types package ([145b2ab](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/145b2ab))
* Restructure locations of some type definitions to make them easier to import without large dependency trees ([c729806](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c729806))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.1.1...1.2.0) (2018-11-14)


### Bug Fixes

* add pharos typings, handle pharos reconnection logic, add pharosAPI tests ([85bb728](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/85bb728))
* correct test file structure ([c72698e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c72698e))
* emit deviceId with device debug message ([ba6ae95](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ba6ae95))
* refactor tests ([f251f69](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f251f69))
* use pre ordered commands from casparcg-state ([04ed282](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/04ed282))


### Features

* **Panasonic PTZ:** add support for zoom & zoom speed control ([0da79a1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0da79a1))



<a name="1.1.1"></a>
## [1.1.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.1.0...1.1.1) (2018-10-24)



<a name="1.1.0"></a>
# [1.1.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.1...1.1.0) (2018-10-24)


### Bug Fixes

* update Pharos test ([f799af4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f799af4))


### Features

* add Pharos-device (wip) ([b099ba8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b099ba8))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/1.0.0...1.0.1) (2018-10-19)


### Bug Fixes

* Add some additional logging to atem resolving to pin down issues after make ready ([abf6943](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/abf6943))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.4...1.0.0) (2018-10-19)


### Bug Fixes

* added basic hyperdeck mock ([e0c03f7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e0c03f7))
* added proper dispose/terminate functions to devices ([1785d52](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1785d52))
* change MappingPanasonicPtzType to a traditional enum ([69e8a95](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/69e8a95))
* command execution queue ([64cc4a8](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/64cc4a8))
* don't reset caspar states if it's not okToDestroyStuff ([1d5e19a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1d5e19a))
* falsy preset number (0) did not execute ([40f2b00](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/40f2b00))
* panasonicPTZ: refactoring dispose functions & proper error emits ([a0cc49f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a0cc49f))
* refactor log messages ([2f7684e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2f7684e))
* remove unneccesary tracing of normal behaviour ([ed05c09](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ed05c09))
* removed deprecated externalLog ([e356271](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e356271))
* **hyperdeck:** Update for api changes ([90d2bd0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/90d2bd0))
* **Panasonic PTZ:** make all settings optional ([53124c3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/53124c3))
* **Panasonic PTZ:** optional port was not optional ([ce5a322](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ce5a322))
* update CasparcgVideoPlayES6example.js ([48077fa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/48077fa))
* update hyperdeck mock to test commands ([72feb67](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/72feb67))


### Features

* add a interval camera state check ([3ba352a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3ba352a))
* add optional port setting ([8eacb8c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8eacb8c))
* **hyperdeck:** Recording control ([7c9fec0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7c9fec0))
* added atem PSU status, refactored device methods to abstract ([0789df2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0789df2))
* added getDiff function, to be used for generating command contexts ([3275bf7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3275bf7))
* finish Panasonic PTZ & unit tests ([2cd95fe](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2cd95fe))
* implemented command context in all internally managed devices ([859df4b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/859df4b))
* rehauled how debug messages is sent. Prepared for sending command context (wip) ([fcf1e69](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fcf1e69))
* switch to a single-device design, abstract device control url ([a681dad](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a681dad))


### BREAKING CHANGES

* device.on('connectionChanged') now emits a DeviceStatus object, not a boolean



<a name="0.17.4"></a>
## [0.17.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.3...0.17.4) (2018-10-15)


### Bug Fixes

* ignore FaderMotor errors ([5bf6146](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5bf6146))



<a name="0.17.3"></a>
## [0.17.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.2...0.17.3) (2018-10-10)



<a name="0.17.2"></a>
## [0.17.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.1...0.17.2) (2018-10-04)



<a name="0.17.1"></a>
## [0.17.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.17.0...0.17.1) (2018-09-22)


### Bug Fixes

* **casparcg:** don't try to set time when not using scheduling ([89b3d59](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/89b3d59))



<a name="0.17.0"></a>
# [0.17.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.16.0...0.17.0) (2018-09-21)


### Features

* restart CasparCG from TSR ([069a4b2](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/069a4b2))



<a name="0.16.0"></a>
# [0.16.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.15.0...0.16.0) (2018-09-13)


### Features

* update timeline dependency ([85d17bc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/85d17bc))



<a name="0.15.0"></a>
# [0.15.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.14.0...0.15.0) (2018-09-11)


### Bug Fixes

* Reset atem state as part of makeReady ([1b44a5e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1b44a5e))


### Features

* Add array of commands for HttpSend to send as part of makeReady ([c2518e4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c2518e4))



<a name="0.14.0"></a>
# [0.14.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.8...0.14.0) (2018-09-06)


### Bug Fixes

* tests & dont remove future commands if going to re-add them directly ([c9afbeb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c9afbeb))


### Features

* added .useScheduling option, to allow optional usage of schedule commands. Added fallback to use internal queue when not scheduling. ([0e4b14a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0e4b14a))
* added example file & loosened some typings ([c1132e1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c1132e1))
* test for checking scheduling of commands ([b59551c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b59551c))



<a name="0.13.8"></a>
## [0.13.8](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.7...0.13.8) (2018-09-05)


### Bug Fixes

* **casparcg:** generate sequential command tokens ([3cac6e3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3cac6e3))



<a name="0.13.7"></a>
## [0.13.7](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.6...0.13.7) (2018-09-05)


### Bug Fixes

* update timeline dependency (containing bugfixes) ([2709fa0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2709fa0))



<a name="0.13.6"></a>
## [0.13.6](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.5...0.13.6) (2018-09-04)



<a name="0.13.5"></a>
## [0.13.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.4...0.13.5) (2018-09-03)


### Bug Fixes

* **casparcg:** out transition is built using properties from in transition ([18524a1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/18524a1))



<a name="0.13.4"></a>
## [0.13.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.3...0.13.4) (2018-08-29)


### Bug Fixes

* {clear > now} => {clear >= now} ([06728ed](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/06728ed))



<a name="0.13.3"></a>
## [0.13.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.2...0.13.3) (2018-08-29)


### Bug Fixes

* clean up queued callbacks properly ([495b8f4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/495b8f4))
* timeline dep ([10dc818](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/10dc818))



<a name="0.13.2"></a>
## [0.13.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.1...0.13.2) (2018-08-28)


### Bug Fixes

* **casparcg:** use frames not fields ([9a2306c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9a2306c))



<a name="0.13.1"></a>
## [0.13.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.13.0...0.13.1) (2018-08-27)


### Bug Fixes

* memory leak due to atem state not having state.time ([7d27173](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7d27173))



<a name="0.13.0"></a>
# [0.13.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.12.0...0.13.0) (2018-08-21)


### Bug Fixes

* **atem:** Super Source properties do not require an index. ([a6ac7d9](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a6ac7d9))
* **casparcg:** retry strategy for setting timecode ([99a1029](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/99a1029))


### Features

* emit for successful command ([6ea2cc7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6ea2cc7))



<a name="0.12.0"></a>
# [0.12.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.11.0...0.12.0) (2018-08-20)


### Features

* updated timeline dependency ([920d98a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/920d98a))



<a name="0.11.0"></a>
# [0.11.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.10.1...0.11.0) (2018-08-17)


### Bug Fixes

* **atem:** Super Source Props defaults ([b2f793e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b2f793e))
* prevent casparcg from stopping init upon slow time command ([d996c33](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d996c33))


### Features

* **atem:** support for super source properties ([9bb21de](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9bb21de))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.10.0...0.10.1) (2018-08-15)



<a name="0.10.0"></a>
# [0.10.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.9.1...0.10.0) (2018-08-10)


### Bug Fixes

* reset the resolver upon reconnection with Atem ([500f884](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/500f884))
* use TimeCommand to set time code ([82f06bc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/82f06bc))


### Features

* bump casparcg-state dependency ([c45eddc](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c45eddc))



<a name="0.9.1"></a>
## [0.9.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.9.0...0.9.1) (2018-08-07)


### Bug Fixes

* emit errors in atem-connection ([642cebd](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/642cebd))
* loadbg is done from state, no longer in tsr ([fd0dfe0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fd0dfe0))
* test ([3c84ea7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3c84ea7))
* updated timeline dependency (performance increase) ([52c5620](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/52c5620))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.8.0...0.9.0) (2018-08-03)


### Bug Fixes

* **casparcg:** upNext not being set properly if playing clip was defined before background on timeline ([27a8ae4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/27a8ae4))
* handle promise appropriately ([8891d65](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8891d65))
* remove deprecated time sync ([84ab05d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/84ab05d))
* set timecode upon reconnection ([e084a74](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e084a74))


### Features

* lookahead/background support ([a16db93](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a16db93))
* sting transitions ([3d3bedf](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3d3bedf))
* **casparcg:** pause media ([9c48003](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/9c48003))
* **casparcg:** route mode ([b214471](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b214471))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.7.0...0.8.0) (2018-08-02)


### Bug Fixes

* abstract can't connect ([a415b96](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a415b96))
* connected status of lawo device ([a9edf59](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a9edf59))
* update dependencies ([7f0ca17](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/7f0ca17))
* updated dependencies ([93201e6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/93201e6))


### Features

* added .canConnect property to devices, for status display ([25d2ded](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/25d2ded))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.8...0.7.0) (2018-07-30)


### Bug Fixes

* keyframes for atem devices ([029fd11](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/029fd11))


### Features

* set state to device state upon connection ([3549c8f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3549c8f))



<a name="0.6.8"></a>
## [0.6.8](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.7...0.6.8) (2018-07-30)



<a name="0.6.7"></a>
## [0.6.7](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.6...0.6.7) (2018-07-30)



<a name="0.6.6"></a>
## [0.6.6](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.5...0.6.6) (2018-07-04)


### Bug Fixes

* Guard against callback resolving time of 0 ([bbc04b6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bbc04b6))



<a name="0.6.5"></a>
## [0.6.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.4...0.6.5) (2018-07-04)


### Bug Fixes

* Device: clean up old saved states ([0115c9a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/0115c9a))



<a name="0.6.4"></a>
## [0.6.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.3...0.6.4) (2018-07-03)



<a name="0.6.3"></a>
## [0.6.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.2...0.6.3) (2018-07-02)


### Bug Fixes

* **CasparCG:** Don't try to resolve a timeline before State is ready ([32c71a3](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/32c71a3))



<a name="0.6.2"></a>
## [0.6.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.1...0.6.2) (2018-06-20)


### Bug Fixes

* atem aux state not being mutated correctly ([a8e8b22](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a8e8b22))



<a name="0.6.1"></a>
## [0.6.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.6.0...0.6.1) (2018-06-20)


### Bug Fixes

* add logging for http send ([ef4528e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ef4528e))
* added try/catch around function execution in doOnTime ([dba832b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dba832b))
* fixed error emits ([68833ec](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/68833ec))
* handle unknown http-send type more gracefully ([fb88725](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fb88725))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.5.0...0.6.0) (2018-06-19)


### Features

* Add http put requests to httpSend ([5e66ae0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5e66ae0))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.4.1...0.5.0) (2018-06-19)


### Features

* logs info through tsr ([3a2e182](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3a2e182))



<a name="0.4.1"></a>
## [0.4.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.4.0...0.4.1) (2018-06-19)



<a name="0.4.0"></a>
# [0.4.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.3.0...0.4.0) (2018-06-18)


### Features

* Ensure LLayers are run in a predictable order (name order), to allow for overriding values from other layers. ([fd2ca4f](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fd2ca4f))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.2.1...0.3.0) (2018-06-18)


### Bug Fixes

* **Lawo:** Handling error emitted by emberplus ([efae206](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/efae206))
* removes unused code in ember onConnected ([21ce669](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/21ce669))


### Features

* **Ember:** Basic ember+ commands ([bde257c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/bde257c))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.2.0...0.2.1) (2018-06-15)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.1.5...0.2.0) (2018-06-15)


### Features

* **Atem:** enforce the device state upon connection ([466f7f6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/466f7f6))



<a name="0.1.5"></a>
## [0.1.5](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/0.1.4...0.1.5) (2018-06-15)



<a name="0.1.4"></a>
## [0.1.4](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/v0.1.3...v0.1.4) (2018-06-14)



<a name="0.1.3"></a>
## [0.1.3](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/v0.1.2...v0.1.3) (2018-06-14)



<a name="0.1.2"></a>
## [0.1.2](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/v0.1.1...v0.1.2) (2018-06-14)



<a name="0.1.1"></a>
## [0.1.1](https://github.com/nrkno/tv-automation-state-timeline-resolver/compare/v0.1.0...v0.1.1) (2018-06-14)



<a name="0.1.0"></a>
# 0.1.0 (2018-06-14)


### Bug Fixes

* **atem:** import abstract commands from library exports ([827a34e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/827a34e))
* **Atem:** connected event fires after state was initiated ([f8d053b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f8d053b))
* update yarn.lock ([012c19c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/012c19c))
* **Atem:** Do a deep merge on the content attributes ([99faf76](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/99faf76))
* **CasparCG:** all layers are generated, commands always execute ([334f31d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/334f31d))
* **CasparCG:** initiation of device waits for timecode ([3fde8f4](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3fde8f4))
* **core:** empty state is not compared ([ee2d928](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ee2d928))
* **Lawo:** Handling error emitted by emberplus ([3bd1c6e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3bd1c6e))
* use npm versions of libraries ([8718e28](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8718e28))
* **tests:** export AMCP classes from the connection lib stub ([8ce7094](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/8ce7094))
* add circleCI badge ([f0911f1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/f0911f1))
* ATEM SSrc box handling ([e9eee48](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e9eee48))
* fixes options for lawo devices ([57d6097](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/57d6097))
* minor package fix ([fd86b40](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fd86b40))
* set correct github repo ([3fc024d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3fc024d))
* set correct lib name ([35a3eb6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/35a3eb6))
* timecode expects frames not fields ([927ac4c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/927ac4c))
* update license ([a4960ae](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a4960ae))
* update ssh figerprint ([34005b1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/34005b1))
* use open source versions of superfly/nrkno packages ([192c5c7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/192c5c7))
* wait for atem state to fill up ([5790630](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5790630))


### Features

* add all scripts + colaborators ([6d97cc0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6d97cc0))
* Add atem device ([532b5ff](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/532b5ff))
* added CasparCG mock (wip) ([2d0c747](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/2d0c747))
* added conductor test ([6cd6c03](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/6cd6c03))
* **casparcg:** added route and record type ([ec97f67](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/ec97f67))
* added typescript and build boilerplate ([1d59d8e](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/1d59d8e))
* **Atem:** Abstraction for working with ME's ([e009d34](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e009d34))
* **casparcg:** add support for loadbg command ([65538e0](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/65538e0))
* **casparcg:** add template and input type ([74b744c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/74b744c))
* **casparcg:** command scheduling (local) ([60ddff1](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/60ddff1))
* **casparcg:** fix command generation ([610f5fa](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/610f5fa))
* **casparcg:** implement rough structure for transitions ([fa5641a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/fa5641a))
* **casparcg:** keep current state ([a44b250](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a44b250))
* **casparcg:** mixer commands ([dc98792](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/dc98792))
* **casparcg:** new state structure ([01f5b14](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/01f5b14))
* **casparcg:** some preliminary safeguards ([e3e949b](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/e3e949b))
* **CasparCG:** resolve states to commands. ([5a50410](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5a50410))
* **core:** distribute commands to devices ([3294553](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3294553))
* **core:** timing interval ([c326a97](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/c326a97))
* **Lawo:** Dynamic Attributes ([3d4889c](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3d4889c))
* cache the Lawo Nodes during connection lifetime ([a8e3816](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/a8e3816))
* **mappings:** removes mapping resolver ([11767a7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/11767a7))
* enforce defaults after connection ([91315a5](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/91315a5))
* fader ramp function as transition ([d2a3e85](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/d2a3e85))
* Lawo Device ([b22c75a](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/b22c75a))
* **Runtime config:** devices ([084ea01](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/084ea01))
* **Runtime config:** mappings ([74335ca](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/74335ca))
* **Scheduled Commands:** Use timecode to schedule commands in CasparCG ([36ebcb7](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/36ebcb7))
* moved around logic to devices from the conductor, etc ([221f2fb](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/221f2fb))
* process timelines into state ([5a098f6](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/5a098f6))
* remove travis, add multiple needed files ([36c089d](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/36c089d))
* stubbed code structure ([3971305](https://github.com/nrkno/tv-automation-state-timeline-resolver/commit/3971305))
