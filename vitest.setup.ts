import "@testing-library/jest-dom";
import { vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();
