<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import interact from "interactjs";
import type { InteractEvent } from "@interactjs/core/InteractEvent";
import {
  getRandomNumberByRange,
  createImageElement,
  verifyCaptcha,
} from "../common/utils";
import { CaptchaStateEnum, SliderStateEnum } from "../common/constants";

const options = reactive({
  width: 280, // canvas 宽度
  height: 155, // canvas 高度
  sliderL: 42, // 滑块边长
  sliderR: 9, // 滑块半径
  offset: 5, // 容错偏差
  loadingText: "正在加载中...",
  failedText: "再试一次",
  barText: "向右滑动填充拼图",
  getImageURL() {
    return (
      "https://picsum.photos/" +
      options.width +
      "/" +
      options.height +
      ".jpg?random=" +
      Date.now()
    );
  },
});
const imageWidth = computed(() => options.width - 2); // 图片实际边长
const blockWidth = computed(() => options.sliderL + options.sliderR * 2 + 3); // 滑块实际边长
const canvas = ref<HTMLCanvasElement | null>(null);
const block = ref<HTMLCanvasElement | null>(null);
const slider = ref<HTMLCanvasElement | null>(null);
const blockPosition = reactive({
  x: 0,
  y: 0,
});
const sliderStartPosition = reactive({
  originX: 0,
  originY: 0,
});
const trails = reactive<number[]>([]); // 拖动时y轴的移动距离
const isMouseDown = ref(false);
const captchaState = ref<CaptchaStateEnum>(CaptchaStateEnum.LOADING);
const captchaIsLoading = computed(
  () => captchaState.value === CaptchaStateEnum.LOADING
);
const sliderState = ref<SliderStateEnum>(SliderStateEnum.NORMAL);
const sliderLeft = ref(0);
const blockLeft = ref(0);
const sliderMaskWidth = ref(0);
const sliderContainerClassName = computed(() => {
  switch (sliderState.value) {
    case SliderStateEnum.ACTIVE:
      return "active";
    case SliderStateEnum.SUCCESS:
      return "success";
    case SliderStateEnum.FAIL:
      return "fail";
    default:
      return "";
  }
});
const sliderText = computed(() => {
  if (captchaState.value === CaptchaStateEnum.LOADING) {
    return options.loadingText;
  }
  switch (sliderState.value) {
    case SliderStateEnum.NORMAL:
      return options.barText;
    case SliderStateEnum.FAIL:
      return options.failedText;
    default:
      return "";
  }
});

const drawCanvas = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  operation: "fill" | "clip"
) => {
  const l = options.sliderL;
  const r = options.sliderR;
  const PI = Math.PI;

  if (operation === "clip") {
    x = 3;
    y += 1;
  }

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x + l / 2, y - r + 2, r, 0.72 * PI, 2.26 * PI);
  ctx.lineTo(x + l, y);
  ctx.arc(x + l + r - 2, y + l / 2, r, 1.21 * PI, 2.78 * PI);
  ctx.lineTo(x + l, y + l);
  ctx.lineTo(x, y + l);
  ctx.arc(x + r - 2, y + l / 2, r + 0.4, 2.76 * PI, 1.24 * PI, true);
  ctx.lineTo(x, y);
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.stroke();
  ctx.save();
  ctx[operation]();
  ctx.globalCompositeOperation = "destination-over";
};

const createCaptcha = () => {
  const canvasCtx = canvas.value?.getContext("2d");
  const blockCtx = block.value?.getContext("2d");
  if (!canvasCtx || !blockCtx) {
    return;
  }
  const L = blockWidth.value;
  const x = getRandomNumberByRange(L + 10, options.width - (L + 10));
  const y = getRandomNumberByRange(
    10 + options.sliderR * 2,
    options.height - (L + 10)
  );
  blockPosition.x = x;
  blockPosition.y = y;
  drawCanvas(canvasCtx, x, y, "fill");
  drawCanvas(blockCtx, x, y, "clip");

  createImageElement(options.getImageURL()).then(
    (img) => {
      canvasCtx.drawImage(img, 0, 0, imageWidth.value, options.height);
      blockCtx.drawImage(img, -x, 0, imageWidth.value, options.height);
      captchaState.value = CaptchaStateEnum.DEFAULT;
    },
    () => {
      captchaState.value = CaptchaStateEnum.ERROR;
    }
  );
};

const bindDragEvent = () => {
  const sliderElm = slider.value;
  if (!sliderElm) {
    return;
  }
  interact(sliderElm).draggable({
    listeners: {
      start(event: InteractEvent) {
        const { clientX, clientY } = event;
        sliderStartPosition.originX = clientX;
        sliderStartPosition.originY = clientY;
        isMouseDown.value = true;
      },
      move(event: InteractEvent) {
        if (!isMouseDown.value) {
          return;
        }
        const { clientX, clientY } = event;
        const { originX, originY } = sliderStartPosition;
        const moveX = clientX - originX;
        const moveY = clientY - originY;
        if (moveX < 0 || moveX + 40 > options.width) {
          return;
        }
        blockLeft.value =
          ((options.width - 40 - 20) / (options.width - 40)) * moveX;
        sliderLeft.value = moveX - 1;
        sliderMaskWidth.value = moveX + 4;
        sliderState.value = SliderStateEnum.ACTIVE;
        trails.push(Math.round(moveY));
      },
      end(event: InteractEvent) {
        if (!isMouseDown.value) {
          return;
        }
        isMouseDown.value = false;
        if (event.clientX === sliderStartPosition.originX) {
          return;
        }
        const { spliced, verified } = verifyCaptcha(trails, {
          left: blockLeft.value,
          x: blockPosition.x,
          offset: options.offset,
        });
        if (verified && spliced) {
          sliderState.value = SliderStateEnum.SUCCESS;
        } else {
          sliderState.value = SliderStateEnum.FAIL;
        }
      },
    },
  });
};

const resetCaptcha = () => {
  captchaState.value = CaptchaStateEnum.LOADING;
  sliderState.value = SliderStateEnum.NORMAL;
  sliderLeft.value = 0;
  blockLeft.value = 0;
  sliderMaskWidth.value = 0;
  const canvasCtx = canvas.value?.getContext("2d");
  const blockCtx = block.value?.getContext("2d");
  if (!canvasCtx || !blockCtx) {
    return;
  }
  canvasCtx.restore();
  canvasCtx.clearRect(0, 0, options.width, options.height);
  blockCtx.restore();
  blockCtx.clearRect(0, 0, options.width, options.height);
  createCaptcha();
};

onMounted(() => {
  createCaptcha();
  bindDragEvent();
});
</script>

<template>
  <el-card v-loading="captchaIsLoading" class="slider-captcha">
    <template #header>
      <div class="slider-captcha-header">
        <span>请完成安全验证!</span>
        <el-button text @click="resetCaptcha()">
          <el-icon>
            <i-ep-refresh />
          </el-icon>
        </el-button>
      </div>
    </template>
    <div
      class="slider-captcha-body"
      :style="{
        width: options.width,
      }"
    >
      <canvas
        ref="canvas"
        class="slider-captcha-image"
        :width="imageWidth"
        :height="options.height"
      ></canvas>
      <canvas
        ref="block"
        class="slider-captcha-block"
        :style="{ left: blockLeft + 'px' }"
        :width="blockWidth"
        :height="options.height"
      ></canvas>
      <div class="slider-container" :class="[sliderContainerClassName]">
        <div class="slider-mask" :style="{ width: sliderMaskWidth + 'px' }">
          <div ref="slider" class="slider" :style="{ left: sliderLeft + 'px' }">
            <el-icon class="slider-icon">
              <i-ep-check v-if="sliderState === SliderStateEnum.SUCCESS" />
              <i-ep-close v-else-if="sliderState === SliderStateEnum.FAIL" />
              <i-ep-right v-else />
            </el-icon>
          </div>
        </div>
        <span class="slider-text">
          {{ sliderText }}
        </span>
      </div>
    </div>
  </el-card>
</template>

<style lang="postcss">
.slider-captcha {
  display: inline-block;

  & .slider-captcha-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  & .slider-captcha-body {
    position: relative;

    & .slider-captcha-image {
      display: block;
      border: var(--el-border);
      border-radius: var(--el-border-radius-base);
    }

    & .slider-captcha-block {
      position: absolute;
      top: 0;
      left: 0;
      display: block;
    }
  }
}

:root {
  --slider-size: 40px;
  --el-transition-bg-color: background-color var(--el-transition-duration-fast)
    var(--el-transition-function-ease-in-out-bezier);
}

.slider-container {
  position: relative;
  height: var(--slider-size);
  color: var(--el-text-color-primary);
  line-height: var(--slider-size);
  text-align: center;
  background-color: var(--el-bg-color-page);
  border: var(--el-border);
  border-radius: var(--el-border-radius-small);

  & .slider-mask {
    position: absolute;
    top: 0;
    left: 0;
    height: var(--slider-size);
    border: 0 var(--el-border-style) var(--el-color-primary);
    border-radius: var(--el-border-radius-small);

    & .slider {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--slider-size);
      height: var(--slider-size);
      background-color: var(--el-color-white);
      border-radius: var(--el-border-radius-small);
      box-shadow: var(--el-box-shadow);
      transition: var(--el-transition-bg-color);
      touch-action: none;

      &:hover {
        background-color: var(--el-color-primary);
      }
    }
  }

  &.active {
    & .slider-mask {
      border: var(--el-border-width) var(--el-border-style)
        var(--el-color-primary);

      & .slider {
        border: var(--el-border-width) var(--el-border-style)
          var(--el-color-primary);
      }
    }
  }

  &.success {
    & .slider-mask {
      background-color: var(--el-color-success-light-7);
      border: var(--el-border-width) var(--el-border-style)
        var(--el-color-success);

      & .slider {
        background-color: var(--el-color-success);
        border: var(--el-border-width) var(--el-border-style)
          var(--el-color-success);
      }
    }
  }

  &.fail {
    & .slider-mask {
      background-color: var(--el-color-danger-light-7);
      border: var(--el-border-width) var(--el-border-style)
        var(--el-color-danger);

      & .slider {
        background-color: var(--el-color-danger);
        border: var(--el-border-width) var(--el-border-style)
          var(--el-color-danger);
      }
    }
  }

  & .slider-text {
    position: relative;
    user-select: none;
  }

  &.active,
  &.success,
  &.fail {
    & .slider-mask {
      border-width: var(--el-border-width) 0 var(--el-border-width)
        var(--el-border-width);

      & .slider {
        top: -1px;

        &:hover {
          background-color: inherit;
        }
      }
    }

    & .slider-text {
      display: none;
    }
  }
}
</style>
