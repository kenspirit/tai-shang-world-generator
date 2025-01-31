window.onload = function () {
  var oDiv = document.getElementById('moving-block');
  var map = document.querySelector('#map');
  var wrapper = document.querySelector('#map-container');

  const stepLength = 2.5;
  let direction = null;
  let targetPosition = null;

  document.onkeydown = function (ev) {
    var ev = ev || event;
    var keyCode = ev.keyCode;

    switch (keyCode) {
      case 37:
        ev.preventDefault();
        direction = 'left';
        move(oDiv, direction, stepLength);
        break;
      case 38:
        ev.preventDefault();
        direction = 'top';
        move(oDiv, direction, stepLength);
        break;
      case 39:
        ev.preventDefault();
        direction = 'right';
        move(oDiv, direction, stepLength);
        break;
      case 40:
        ev.preventDefault();
        direction = 'bottom';
        move(oDiv, direction, stepLength);
        break;
      case 32:
        ev.preventDefault();
        interact(oDiv, direction);
        break;
      case 33: // PageUp
      case 34: // PageDown
      case 35: // End
      case 36: // Home
        ev.preventDefault();
    }
  };

  document.onkeyup = function (ev) {
    var ev = ev || event;
    var keyCode = ev.keyCode;

    switch (keyCode) {
      case 37:
        ev.preventDefault();
        direction = 'left';
        break;
      case 38:
        ev.preventDefault();
        direction = 'top';
        break;
      case 39:
        ev.preventDefault();
        direction = 'right';
        break;
      case 40:
        ev.preventDefault();
        direction = 'bottom';
        break;
      case 32:
        ev.preventDefault();
        break;
      default:
        ev.preventDefault();
    }
  };

  // move moving-block when possible
  const move = (oDiv, direction, stepLength) => {
    if (willCrossBorder(oDiv, map, direction, stepLength)) {
      return;
    }

    const style = oDiv.style;
    const currentPosition = getCoordinate(oDiv, stepLength);

    if (willCollide(currentPosition, direction)) {
      return;
    }

    switch (direction) {
      case 'left':
        style.left = parseFloat(style.left) - stepLength + 'vw';
        break;
      case 'top':
        style.top = parseFloat(style.top) - stepLength + 'vw';
        scrollIfNeeded(oDiv, wrapper, 'top');
        break;
      case 'right':
        style.left = parseFloat(style.left) + stepLength + 'vw';
        break;
      case 'bottom':
        style.top = parseFloat(style.top) + stepLength + 'vw';
        scrollIfNeeded(oDiv, wrapper, 'bottom');
        break;
      default:
        break;
    }
  };

  const interact = async (oDiv, direction) => {
    if (!direction) {
      return;
    }

    const currentPosition = getCoordinate(oDiv, stepLength);

    switch (direction) {
      case 'left':
        targetPosition = {
          x: currentPosition.x,
          y: currentPosition.y - 1,
        }
        break;
      case 'right':
        targetPosition = {
          x: currentPosition.x,
          y: currentPosition.y + 1,
        }
        break;
      case 'top':
        targetPosition = {
          x: currentPosition.x - 1,
          y: currentPosition.y,
        }
        break;
      case 'bottom':
        targetPosition = {
          x: currentPosition.x + 1,
          y: currentPosition.y,
        }
        break;
      default:
        break;
    }

    const targetBlock = document
      .querySelectorAll('.map-row')[targetPosition.x]
      .children.item(targetPosition.y);

    if (/sprite\d+/.test(targetBlock.className)) {
      await interactNpc(targetPosition);
    } else if (/treasure-locked-\d+/.test(targetBlock.className)) {
      openTreasureBox(targetPosition);
    }
  }

  // check if moving-block will be out of map
  const willCrossBorder = (oDiv, map, direction, stepLength) => {
    if (direction === 'left') {
      if (oDiv.offsetLeft - stepLength < 0) {
        return true;
      }
      return false;
    } else if (direction === 'right') {
      if (oDiv.offsetLeft + oDiv.clientWidth + stepLength > map.clientWidth) {
        return true;
      }
      return false;
    } else if (direction === 'top') {
      if (oDiv.offsetTop - stepLength < 0) {
        return true;
      }
      return false;
    } else if (direction === 'bottom') {
      if (oDiv.offsetTop + oDiv.clientHeight + stepLength > map.clientHeight) {
        return true;
      }
      return false;
    }
  };

  const scrollSmoothly = (scrollLength, scrollStep) => {
    const scrollInterval = setInterval(() => {
      wrapper.scrollBy(0, scrollStep);
      scrollLength -= scrollStep;
      if (scrollLength === 0) {
        clearInterval(scrollInterval);
      }
    });
  };

  // scroll map when part of moving-block is out of wrapper
  const scrollIfNeeded = (oDiv, wrapper, direction) => {
    const scrollLength = parseInt(wrapper.clientHeight / 3);
    if (
      direction === 'bottom' &&
      oDiv.getBoundingClientRect().bottom >
        wrapper.getBoundingClientRect().bottom
    ) {
      scrollSmoothly(scrollLength, 1);
    } else if (
      direction === 'top' &&
      oDiv.getBoundingClientRect().top < wrapper.getBoundingClientRect().top
    ) {
      scrollSmoothly(-scrollLength, -1);
    }
  };

  const getCoordinate = (oDiv, stepLength) => {
    const x = parseFloat(oDiv.style.top) / stepLength;
    const y = parseFloat(oDiv.style.left) / stepLength;
    
    return { x, y };
  }

  const willCollide = (currentPosition, direction) => {
    let { x, y } = currentPosition;

    if (direction === 'left') {
      y -= 1;
    } else if (direction === 'right') {
      y += 1;
    } else if (direction === 'top') {
      x -= 1;
    } else if (direction === 'bottom') {
      x += 1;
    }

    return document
      .querySelectorAll('.map-row')[x]
      .children.item(y)
      .classList.contains('unwalkable')
  }

  const interactNpc = async (targetPosition) => {
    const blockNumberNode = document.getElementById('block-number');
    const blockNumber = blockNumberNode.value;
    const interactResponse = await getInteractResponse(targetPosition, blockNumber);

    if (interactResponse.error_code === 0) {
      const dialogContent = interactResponse.result.event.payload.first;
      showNpcDialog(dialogContent);
    }
  }

  const getInteractResponse = async (targetPosition, blockNumber) => {
    const { x, y } = targetPosition;
    
    let interactApi = `https://map.noncegeek.com/tai_shang_world_generator/api/v1/interact?x=${y}&y=${x}&block_height=${blockNumber}`;

    let interactResponse = await axios
      .get(interactApi)
      .catch((err) => {
        console.log(err);
      });

    return interactResponse.data;
  }

  const showNpcDialog = (dialogContent) => {
    document.querySelector('.dialog-content').innerText = dialogContent.text;
    document.querySelector('.dialog-action-no').innerText = dialogContent.btn.no;
    document.querySelector('.dialog-action-yes').innerText = dialogContent.btn.yes;

    document.querySelector('.dialog').classList.remove('hidden');

    const noListener = () => {
      closeNpcDialog('say no');
      // TODO: 下面的代码放到该函数外面不生效
      document.querySelector('.dialog-action-no').removeEventListener('click', noListener);
    }
    document.querySelector('.dialog-action-no').addEventListener('click', noListener, false);

    const yesListener = () => {
      closeNpcDialog('say yes');
      document.querySelector('.dialog-action-yes').removeEventListener('click', yesListener);
    }
    document.querySelector('.dialog-action-yes').addEventListener('click', yesListener, false);
  }

  const closeNpcDialog = (action) => {
    console.log(action);
    document.querySelector('.dialog').classList.add('hidden');
  }

  const openTreasureBox = (targetPosition) => {
    const treasureBox = document
      .querySelectorAll('.map-row')[targetPosition.x]
      .children.item(targetPosition.y);

    treasureBox.className = treasureBox.className.replace('treasure-locked', 'treasure-unlocked');
    treasureBox.innerHTML = treasureBox.innerHTML.replace('treasure-locked', 'treasure-unlocked')
  }
};
