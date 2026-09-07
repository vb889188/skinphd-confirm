#!/usr/bin/env python3
"""
Headless Staff create + sign-in check against a live Confirm origin.

  pip install selenium
  # Chrome + matching ChromeDriver on PATH

  CONFIRM_URL=http://139.59.183.201 \
  CONFIRM_HO_EMAIL=amelia@pilot.local \
  CONFIRM_HO_PIN=2468 \
  python3 scripts/selenium-staff-flow.py
"""
from __future__ import annotations

import os
import time
import uuid
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

URL = os.environ.get("CONFIRM_URL", "http://139.59.183.201")
HO_EMAIL = os.environ.get("CONFIRM_HO_EMAIL", "amelia@pilot.local")
HO_PIN = os.environ.get("CONFIRM_HO_PIN", "2468")
TEST_EMAIL = os.environ.get("CONFIRM_TEST_EMAIL", f"selenium.{uuid.uuid4().hex[:8]}@pilot.local")
TEST_PIN = os.environ.get("CONFIRM_TEST_PIN", "4321")


def driver() -> webdriver.Chrome:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1400,900")
    return webdriver.Chrome(options=options)


def sign_in(browser: webdriver.Chrome, wait: WebDriverWait, email: str, pin: str) -> None:
    browser.get(URL)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='email']"))).send_keys(email)
    browser.find_element(By.CSS_SELECTOR, "input[name='pin']").send_keys(pin)
    browser.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Sign out')]")))


def main() -> None:
    browser = driver()
    wait = WebDriverWait(browser, 20)
    try:
        sign_in(browser, wait, HO_EMAIL, HO_PIN)
        browser.find_element(By.XPATH, "//button[contains(., 'Staff')]").click()
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='fullName']"))).send_keys("Selenium Test")
        browser.find_element(By.CSS_SELECTOR, "input[name='email']").send_keys(TEST_EMAIL)
        browser.find_element(By.CSS_SELECTOR, "input[name='pin']").send_keys(TEST_PIN)
        Select(browser.find_element(By.CSS_SELECTOR, "select[name='role']")).select_by_value("employee")
        browser.find_element(By.XPATH, "//button[contains(., 'Add person')]").click()
        wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Send email')]"))).click()
        time.sleep(3)
        browser.find_element(By.XPATH, "//button[contains(., 'Sign out')]").click()
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='email']")))
        sign_in(browser, wait, TEST_EMAIL, TEST_PIN)
        print("PASS", TEST_EMAIL, TEST_PIN)
    finally:
        browser.quit()


if __name__ == "__main__":
    main()
